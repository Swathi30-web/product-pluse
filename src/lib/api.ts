
import axios from 'axios';
import type {
  Activity,
  Category,
  Comment,
  Feedback,
  Tag,
  User,
  Vote,
} from './types';

const http = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    'https://product-pluse.onrender.com',
  timeout: 15000,
});

export const api = {
  list: <T,>(
    resource: string,
    params?: Record<string, unknown>
  ) =>
    http
      .get<T[]>(`/${resource}`, { params })
      .then((r) => r.data),

  get: <T,>(resource: string, id: number | string) =>
    http
      .get<T>(`/${resource}/${id}`)
      .then((r) => r.data),

  create: <T,>(
    resource: string,
    body: Record<string, unknown>
  ) =>
    http
      .post<T>(`/${resource}`, body)
      .then((r) => r.data),

  update: <T,>(
    resource: string,
    id: number | string,
    body: Record<string, unknown>
  ) =>
    http
      .patch<T>(`/${resource}/${id}`, body)
      .then((r) => r.data),

  remove: (resource: string, id: number | string) =>
    http
      .delete(`/${resource}/${id}`)
      .then(() => undefined),
};

export function errMsg(e: unknown): string {
  if (axios.isAxiosError(e)) {
    if (!e.response) {
      return (
        'Cannot reach the API server. Check the Render backend URL: ' +
        http.defaults.baseURL
      );
    }

    return `Request failed (${e.response.status})`;
  }

  return e instanceof Error
    ? e.message
    : 'Something went wrong';
}

export const logActivity = (
  workspaceId: number,
  userId: number,
  action: string
) =>
  api
    .create<Activity>('activityLogs', {
      workspaceId,
      userId,
      action,
      createdAt: new Date().toISOString(),
    })
    .catch(() => undefined);

export interface Bundle {
  feedback: Feedback[];
  votes: Vote[];
  comments: Comment[];
  categories: Category[];
  tags: Tag[];
  users: User[];
}

export async function loadBundle(
  workspaceId: number
): Promise<Bundle> {
  const params = { workspaceId };

  const [
    feedback,
    votes,
    comments,
    categories,
    tags,
    users,
  ] = await Promise.all([
    api.list<Feedback>('feedback', params),
    api.list<Vote>('votes', params),
    api.list<Comment>('comments', params),
    api.list<Category>('categories', params),
    api.list<Tag>('tags', params),
    api.list<User>('users'),
  ]);

  return {
    feedback,
    votes,
    comments,
    categories,
    tags,
    users: users.map(({ password, ...user }) => user),
  };
}

/**
 * Toggle a user's vote on a feedback item.
 * Returns true when the vote is added.
 */
export async function toggleVote(
  workspaceId: number,
  feedbackId: number,
  userId: number
): Promise<boolean> {
  const existing = await api.list<Vote>('votes', {
    feedbackId,
    userId,
  });

  if (existing.length > 0) {
    await Promise.all(
      existing.map((vote) => api.remove('votes', vote.id))
    );
    return false;
  }

  await api.create<Vote>('votes', {
    workspaceId,
    feedbackId,
    userId,
  });

  return true;
}
