export type UserRole = 'admin' | 'family_member' | 'contributor';

export interface IUser {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  relationship: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type MemoryCategory = 
  | 'Childhood'
  | 'Family'
  | 'Friends'
  | 'Celebrations'
  | 'Travel'
  | 'Favourite Moments'
  | 'Special Occasions';

export type MediaType = 'photo' | 'video' | 'audio';

export interface IMemory {
  title: string;
  description?: string;
  mediaType: MediaType;
  category: MemoryCategory;
  albumId?: any;
  mediaUrl: string;
  thumbnailUrl?: string;
  s3Key?: string;
  dateTaken?: Date;
  location?: string;
  isFavorite: boolean;
  uploadedBy: any;
  fileSize?: number;
  mimeType?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAlbum {
  title: string;
  description?: string;
  category: MemoryCategory;
  coverImageUrl?: string;
  itemCount?: number;
  createdBy: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IVideo {
  title: string;
  caption?: string;
  category: MemoryCategory;
  mediaUrl: string;
  thumbnailUrl?: string;
  s3Key?: string;
  duration?: number;
  fileSize?: number;
  uploadedBy: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAudioMemory {
  title: string;
  description?: string;
  mediaUrl: string;
  s3Key?: string;
  duration: number;
  waveformPoints?: number[];
  isFavorite: boolean;
  recordedDate?: Date;
  uploadedBy: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITimelineEvent {
  year: number;
  date?: string;
  title: string;
  description: string;
  location?: string;
  photos: string[];
  videos?: string[];
  order: number;
  createdBy: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ILetter {
  senderName: string;
  relationship: string;
  title: string;
  body: string;
  paperStyle?: 'cream' | 'linen' | 'parchment' | 'lavender';
  isPrivate: boolean;
  isDraft: boolean;
  createdBy: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ContributionStatus = 'pending' | 'approved' | 'rejected';

export interface IContribution {
  contributorName: string;
  relationship: string;
  type: 'photo' | 'video' | 'audio' | 'letter';
  title: string;
  note?: string;
  mediaUrl?: string;
  s3Key?: string;
  letterBody?: string;
  category?: MemoryCategory;
  status: ContributionStatus;
  reviewedBy?: any;
  reviewNotes?: string;
  reviewedAt?: Date;
  submittedBy: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISpecialDate {
  title: string;
  date: string;
  month: number;
  day: number;
  year?: number;
  type: 'birthday' | 'anniversary' | 'remembrance' | 'holiday' | 'custom';
  notes?: string;
  iconName?: string;
  createdAt?: Date;
}

export interface IAuditLog {
  action: string;
  performedBy: any;
  targetType: string;
  targetId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  timestamp: Date;
}
