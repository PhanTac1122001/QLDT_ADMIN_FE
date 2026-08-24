"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { COURSE_PUBLISH_STATUS_QUERY_KEY, COURSE_PUBLISH_STATUS_STALE_TIME } from "@/constants/publish.constants";
import { publishService } from "@/services/publish.service";
import type { CoursePublishState } from "@/types/publish.types";
import { getCoursePublishState } from "@/utils/publish.utils";

/**
 * Lấy trạng thái xuất bản cho danh sách môn học đang hiển thị (theo trang hiện tại).
 * Mỗi môn là một query riêng nên kết quả được cache lại và chỉ gọi thêm khi đổi trang.
 */
export function useCoursePublishStates(courseIds: string[]): Record<string, CoursePublishState> {
    const results = useQueries({
        queries: courseIds.map((courseId) => ({
            queryKey: [COURSE_PUBLISH_STATUS_QUERY_KEY, courseId],
            queryFn: () => publishService.getPublishStatus(courseId),
            staleTime: COURSE_PUBLISH_STATUS_STALE_TIME,
            retry: false,
        })),
    });

    return useMemo(() => {
        const states: Record<string, CoursePublishState> = {};
        courseIds.forEach((courseId, index) => {
            const result = results[index];
            states[courseId] = getCoursePublishState(result?.data, result?.isLoading ?? true);
        });
        return states;
    }, [courseIds, results]);
}
