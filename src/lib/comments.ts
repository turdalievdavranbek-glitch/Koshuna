/** Listing comments as the API returns them. No phone or email. */
export type CommentRow = {
  id: string;
  parentId: string | null;
  authorId: string;
  author: string;
  text: string;
  createdAt: string;
  editedAt: string | null;
  likes: number;
  liked: boolean;
  mine: boolean;
  /** Author or the listing owner. */
  canDelete: boolean;
  /** Only the author sees own comments hidden for review. */
  underReview: boolean;
};

export const COMMENT_MAX = 1000;
export const COMMENT_HOURLY_MAX = 10;
