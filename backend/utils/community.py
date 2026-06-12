from schemas import CommunityAuthor, CommunityCommentResponse, CommunityPostResponse


def serialize_author(user) -> CommunityAuthor:
    return CommunityAuthor(
        id=user.id,
        name=user.name,
        email=None,
        public_profile_slug=user.public_profile_slug,
    )


def serialize_comment(comment) -> CommunityCommentResponse:
    return CommunityCommentResponse(
        id=comment.id,
        content=comment.content,
        created_at=comment.created_at,
        author=serialize_author(comment.user),
    )


def serialize_post(post, current_user_id: int | None = None) -> CommunityPostResponse:
    return CommunityPostResponse(
        id=post.id,
        post_type=post.post_type,
        content=post.content,
        image_data=post.image_data,
        created_at=post.created_at,
        author=serialize_author(post.user),
        like_count=len(post.likes),
        comment_count=len(post.comments),
        liked_by_me=any(like.user_id == current_user_id for like in post.likes) if current_user_id else False,
        comments=[serialize_comment(comment) for comment in sorted(post.comments, key=lambda entry: entry.created_at)],
    )
