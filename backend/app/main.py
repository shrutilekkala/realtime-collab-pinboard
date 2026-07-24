import os
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import Base, engine, get_db
from app.ws_manager import manager

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Pinboard API")

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/boards", response_model=schemas.BoardOut)
def create_board(board: schemas.BoardCreate, db: Session = Depends(get_db)):
    db_board = models.Board(name=board.name)
    db.add(db_board)
    db.commit()
    db.refresh(db_board)
    return db_board


@app.get("/boards/{board_id}", response_model=schemas.BoardOut)
def get_board(board_id: int, db: Session = Depends(get_db)):
    db_board = db.get(models.Board, board_id)
    if db_board is None:
        raise HTTPException(status_code=404, detail="Board not found")
    return db_board


@app.post("/boards/{board_id}/notes", response_model=schemas.NoteOut)
async def create_note(
    board_id: int,
    note: schemas.NoteCreate,
    db: Session = Depends(get_db),
    x_client_id: Optional[str] = Header(None),
):
    db_board = db.get(models.Board, board_id)
    if db_board is None:
        raise HTTPException(status_code=404, detail="Board not found")
    db_note = models.Note(board_id=board_id, **note.model_dump())
    db.add(db_note)
    db.commit()
    db.refresh(db_note)

    note_out = schemas.NoteOut.model_validate(db_note).model_dump(mode="json")
    await manager.broadcast(
        board_id, {"type": "note_created", "note": note_out}, exclude_client_id=x_client_id
    )
    return db_note


@app.patch("/notes/{note_id}", response_model=schemas.NoteOut)
async def update_note(
    note_id: int,
    note: schemas.NoteUpdate,
    db: Session = Depends(get_db),
    x_client_id: Optional[str] = Header(None),
):
    db_note = db.get(models.Note, note_id)
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    for field, value in note.model_dump(exclude_unset=True).items():
        setattr(db_note, field, value)
    db.commit()
    db.refresh(db_note)

    note_out = schemas.NoteOut.model_validate(db_note).model_dump(mode="json")
    await manager.broadcast(
        db_note.board_id,
        {"type": "note_updated", "note": note_out},
        exclude_client_id=x_client_id,
    )
    return db_note


@app.delete("/notes/{note_id}", status_code=204)
async def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    x_client_id: Optional[str] = Header(None),
):
    db_note = db.get(models.Note, note_id)
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    board_id = db_note.board_id
    db.delete(db_note)
    db.commit()

    await manager.broadcast(
        board_id,
        {"type": "note_deleted", "note": {"id": note_id}},
        exclude_client_id=x_client_id,
    )


@app.websocket("/ws/board/{board_id}")
async def board_websocket(websocket: WebSocket, board_id: int, client_id: str):
    await manager.connect(board_id, websocket, client_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(board_id, websocket)
