import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .database import engine, Base
from .routers import auth, listings, bookings, reviews, wishlist, amenities, host, experiences

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Airbnb Clone API", version="1.0.0")

allowed_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(amenities.router, prefix="/api")
app.include_router(listings.router, prefix="/api")
app.include_router(bookings.router, prefix="/api")
app.include_router(reviews.router, prefix="/api")
app.include_router(wishlist.router, prefix="/api")
app.include_router(host.router, prefix="/api")
app.include_router(experiences.router, prefix="/api")


@app.get("/")
def root():
    return {"status": "ok", "service": "airbnb-clone-api"}


@app.get("/api/health")
def health():
    return {"status": "ok"}
