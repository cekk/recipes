from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import re


def slugify(text: str) -> str:
    text = text.lower()
    for src, dst in [
        ("à", "a"),
        ("á", "a"),
        ("â", "a"),
        ("ä", "a"),
        ("è", "e"),
        ("é", "e"),
        ("ê", "e"),
        ("ë", "e"),
        ("ì", "i"),
        ("í", "i"),
        ("î", "i"),
        ("ï", "i"),
        ("ò", "o"),
        ("ó", "o"),
        ("ô", "o"),
        ("ö", "o"),
        ("ù", "u"),
        ("ú", "u"),
        ("û", "u"),
        ("ü", "u"),
    ]:
        text = text.replace(src, dst)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


class RecipeSummary(BaseModel):
    id: str
    title: str
    slug: str
    description: Optional[str] = None
    categories: List[str] = []
    prep_time: Optional[int] = None
    cook_time: Optional[int] = None
    servings: Optional[int] = None
    difficulty: Optional[str] = None
    source_url: Optional[str] = None
    source_type: str = "manual"
    image_urls: List[str] = []
    video_urls: List[str] = []
    created_at: str


class Recipe(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    slug: str = ""
    description: Optional[str] = None
    ingredients: List[str] = []
    steps: List[str] = []
    prep_time: Optional[int] = None
    cook_time: Optional[int] = None
    servings: Optional[int] = None
    difficulty: Optional[str] = None
    categories: List[str] = []
    notes: Optional[str] = None
    source_url: Optional[str] = None
    source_type: str = "manual"
    image_urls: List[str] = []
    video_urls: List[str] = []
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    updated_at: Optional[str] = None

    def model_post_init(self, __context):
        if not self.slug:
            self.slug = slugify(self.title)

    def to_summary(self) -> RecipeSummary:
        return RecipeSummary(
            id=self.id,
            title=self.title,
            slug=self.slug,
            description=self.description,
            categories=self.categories,
            prep_time=self.prep_time,
            cook_time=self.cook_time,
            servings=self.servings,
            difficulty=self.difficulty,
            source_url=self.source_url,
            source_type=self.source_type,
            image_urls=self.image_urls,
            video_urls=self.video_urls,
            created_at=self.created_at,
        )


class URLInput(BaseModel):
    url: str


class TextInput(BaseModel):
    text: str


class SearchResult(BaseModel):
    recipe: RecipeSummary
    score: float
