export type Role = 'owner' | 'admin' | 'pm' | 'customer';
export type MemberStatus = 'active' | 'invited' | 'suspended';
export type FStatus = 'open' | 'under_review' | 'planned' | 'in_progress' | 'completed' | 'declined';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Stage = 'under_review' | 'planned' | 'in_progress' | 'completed';
export type ReleaseStatus = 'draft' | 'published' | 'archived';

export interface User { id: number; name: string; email: string; password?: string }
export interface Workspace { id: number; name: string; slug: string; description: string; logoUrl: string; brandColor: string; publicRoadmap: boolean; createdAt: string }
export interface Member { id: number; workspaceId: number; userId: number; role: Role; status: MemberStatus }
export interface Category { id: number; workspaceId: number; name: string; color: string }
export interface Tag { id: number; workspaceId: number; name: string }
export interface Feedback { id: number; workspaceId: number; title: string; description: string; categoryId: number; tagIds: number[]; submitterId: number; priority: Priority; status: FStatus; duplicateOf: number | null; createdAt: string }
export interface Vote { id: number; workspaceId: number; feedbackId: number; userId: number }
export interface Comment { id: number; workspaceId: number; feedbackId: number; userId: number; body: string; createdAt: string }
export interface RoadmapItem { id: number; workspaceId: number; title: string; description: string; stage: Stage; feedbackIds: number[]; published: boolean; createdAt: string }
export interface ReleaseNote { id: number; workspaceId: number; version: string; title: string; releaseDate: string; summary: string; roadmapItemIds: number[]; status: ReleaseStatus }
export interface Plan { id: string; name: string; price: number; maxMembers: number; maxFeedback: number; maxRoadmap: number }
export interface WorkspaceSub { id: number; workspaceId: number; planId: string }
export interface Activity { id: number; workspaceId: number; userId: number; action: string; createdAt: string }
