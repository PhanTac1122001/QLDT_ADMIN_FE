import { CoursePublishState } from "@/types/publish.types";
import type { PublishStatusEntity } from "@/types/publish.types";

/**
 * Quy đổi kết quả API publish-status thành một trạng thái duy nhất để hiển thị badge.
 * Chưa có `lastPublishedAt` nghĩa là môn chưa từng được xuất bản; đã xuất bản mà còn
 * `hasUnpublishedChanges` nghĩa là học liệu đã sửa nhưng sinh viên vẫn thấy bản cũ.
 */
export function getCoursePublishState(status: PublishStatusEntity | undefined, isLoading: boolean): CoursePublishState {
    if (isLoading) return CoursePublishState.LOADING;
    if (!status) return CoursePublishState.UNKNOWN;
    if (!status.lastPublishedAt) return CoursePublishState.UNPUBLISHED;
    if (status.hasUnpublishedChanges) return CoursePublishState.OUTDATED;
    return CoursePublishState.PUBLISHED;
}
