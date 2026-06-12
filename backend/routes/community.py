from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import CommunityChallengeJoin, CommunityComment, CommunityPost, CommunityPostLike, User
from routes.auth import get_current_user
from schemas import (
    CommunityChallengeJoinResponse,
    CommunityChallengeResponse,
    CommunityCommentCreate,
    CommunityCommentResponse,
    CommunityPostCreate,
    CommunityPostResponse,
)
from utils.challenges import CHALLENGES, get_challenge_by_id
from utils.community import serialize_comment, serialize_post


router = APIRouter(prefix="/community", tags=["community"])


def serialize_challenge(challenge, joined_count: int, joined_by_me: bool) -> dict:
    return {
        "id": challenge["id"],
        "name": challenge["name"],
        "icon": challenge["icon"],
        "participants": challenge["participants"] + joined_count,
        "daysLeft": challenge["daysLeft"],
        "joinedByMe": joined_by_me,
        "joinedCount": joined_count,
    }


@router.get("/challenges", response_model=list[CommunityChallengeResponse])
def get_challenges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    joined_rows = db.query(
        CommunityChallengeJoin.challenge_id,
        func.count(CommunityChallengeJoin.id),
    ).group_by(CommunityChallengeJoin.challenge_id).all()
    joined_counts = {challenge_id: count for challenge_id, count in joined_rows}

    joined_by_me = {
        row.challenge_id
        for row in db.query(CommunityChallengeJoin.challenge_id).filter(
            CommunityChallengeJoin.user_id == current_user.id
        ).all()
    }

    return [
        serialize_challenge(
            challenge,
            int(joined_counts.get(challenge["id"], 0) or 0),
            challenge["id"] in joined_by_me,
        )
        for challenge in CHALLENGES
    ]


@router.post("/challenges/{challenge_id}/join", response_model=CommunityChallengeJoinResponse)
def join_challenge(
    challenge_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    challenge = get_challenge_by_id(challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    existing = db.query(CommunityChallengeJoin).filter(
        CommunityChallengeJoin.challenge_id == challenge_id,
        CommunityChallengeJoin.user_id == current_user.id,
    ).first()

    try:
        if not existing:
            db.add(CommunityChallengeJoin(user_id=current_user.id, challenge_id=challenge_id))
            db.commit()

        joined_count = db.query(CommunityChallengeJoin).filter(
            CommunityChallengeJoin.challenge_id == challenge_id
        ).count()
        return {
            **serialize_challenge(challenge, int(joined_count or 0), True),
            "message": "Joined challenge" if not existing else "Already joined",
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/posts", response_model=list[CommunityPostResponse])
def get_posts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    posts = db.query(CommunityPost).join(User).filter(
        (User.profile_visibility != "private") | (CommunityPost.user_id == current_user.id)
    ).order_by(CommunityPost.created_at.desc()).limit(30).all()
    return [serialize_post(post, current_user.id) for post in posts]


@router.post("/posts", response_model=CommunityPostResponse)
def create_post(
    data: CommunityPostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Post content is required")

    try:
        post = CommunityPost(
            user_id=current_user.id,
            post_type=data.post_type,
            content=data.content.strip(),
            image_data=data.image_base64,
        )
        db.add(post)
        db.commit()
        db.refresh(post)
        post.user = current_user
        post.comments = []
        post.likes = []
        return serialize_post(post, current_user.id)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/posts/{post_id}/like")
def toggle_like(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = db.query(CommunityPostLike).filter(
        CommunityPostLike.post_id == post_id,
        CommunityPostLike.user_id == current_user.id,
    ).first()
    try:
        if existing:
            db.delete(existing)
            liked = False
        else:
            db.add(CommunityPostLike(post_id=post_id, user_id=current_user.id))
            liked = True
        db.commit()
        like_count = db.query(CommunityPostLike).filter(CommunityPostLike.post_id == post_id).count()
        return {"liked": liked, "like_count": like_count}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/posts/{post_id}/comments", response_model=CommunityCommentResponse)
def create_comment(
    post_id: int,
    data: CommunityCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Comment content is required")

    try:
        comment = CommunityComment(
            user_id=current_user.id,
            post_id=post_id,
            content=data.content.strip(),
        )
        db.add(comment)
        db.commit()
        db.refresh(comment)
        comment.user = current_user
        return serialize_comment(comment)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
