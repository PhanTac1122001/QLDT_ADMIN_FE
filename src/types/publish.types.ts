export interface PublishIssue {
    code: string;
    message: string;
    sessionId?: string;
    lessonId?: string;
    blockId?: string;
}

export interface PublishReportEntity {
    errors: PublishIssue[];
    warnings: PublishIssue[];
}

export interface PublishStatusEntity {
    version: number;
    lastPublishedAt: string | null;
    hasUnpublishedChanges: boolean;
    issuesIncluded: boolean;
    errors: PublishIssue[];
    warnings: PublishIssue[];
}

export interface PublishReportModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    report: PublishReportEntity | null;
    title?: string;
    isPublishSuccess?: boolean;
}

/** Trạng thái xuất bản học liệu của một môn học hiển thị trên danh sách. */
export enum CoursePublishState {
    /** Đang gọi API lấy trạng thái */
    LOADING = "LOADING",
    /** Không lấy được trạng thái (lỗi mạng / API) */
    UNKNOWN = "UNKNOWN",
    /** Chưa từng xuất bản */
    UNPUBLISHED = "UNPUBLISHED",
    /** Đã xuất bản nhưng học liệu có thay đổi chưa xuất bản lại */
    OUTDATED = "OUTDATED",
    /** Đã xuất bản và không còn thay đổi chờ */
    PUBLISHED = "PUBLISHED",
}
