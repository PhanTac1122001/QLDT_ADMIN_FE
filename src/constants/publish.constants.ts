import { STALE_TIME_FIVE_MINUTES } from "@/constants/query-cache.constants";
import { CoursePublishState } from "@/types/publish.types";

/** Query key gốc cho trạng thái xuất bản của môn học */
export const COURSE_PUBLISH_STATUS_QUERY_KEY = "course-publish-status";

/** Trạng thái xuất bản đổi không thường xuyên nên cache lại 5 phút */
export const COURSE_PUBLISH_STATUS_STALE_TIME = STALE_TIME_FIVE_MINUTES;

/** Class hiển thị badge trạng thái xuất bản trên bảng môn học */
export const COURSE_PUBLISH_BADGE_CLASSES: Record<CoursePublishState, string> = {
    [CoursePublishState.LOADING]: "border-slate-200 bg-slate-50 text-slate-400",
    [CoursePublishState.UNKNOWN]: "border-slate-200 bg-slate-50 text-slate-400",
    [CoursePublishState.UNPUBLISHED]: "border-slate-200 bg-slate-100 text-slate-600",
    [CoursePublishState.OUTDATED]: "border-amber-200 bg-amber-50 text-amber-700",
    [CoursePublishState.PUBLISHED]: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

/** Class của chấm tròn đứng trước nhãn trạng thái */
export const COURSE_PUBLISH_DOT_CLASSES: Record<CoursePublishState, string> = {
    [CoursePublishState.LOADING]: "bg-slate-300",
    [CoursePublishState.UNKNOWN]: "bg-slate-300",
    [CoursePublishState.UNPUBLISHED]: "bg-slate-400",
    [CoursePublishState.OUTDATED]: "bg-amber-500",
    [CoursePublishState.PUBLISHED]: "bg-emerald-500",
};
