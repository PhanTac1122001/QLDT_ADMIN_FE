"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, CalendarPlus, Eye, Pencil, Plus, Send, Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { AssignCourseToSemesterModal } from "@/components/application/modals/assign-course-to-semester-modal";
import { ConfirmModal } from "@/components/application/modals/confirm-modal";
import { CourseFormModal } from "@/components/application/modals/course-form-modal";
import { CourseRpointConfigModal } from "@/components/application/modals/course-rpoint-config-modal";
import { DeleteCourseModal } from "@/components/application/modals/delete-course-modal";
import { PublishReportModal } from "@/components/application/modals/publish-report-modal";
import { TablePagination } from "@/components/application/pagination/table-pagination";
import { SearchFilters } from "@/components/application/search-filters/search-filters";
import { HTTP_STATUS_UNPROCESSABLE_ENTITY } from "@/constants/http.constants";
import { DEFAULT_OPTIONS_LIMIT } from "@/constants/options.constants";
import { COURSE_PUBLISH_BADGE_CLASSES, COURSE_PUBLISH_DOT_CLASSES, COURSE_PUBLISH_STATUS_QUERY_KEY } from "@/constants/publish.constants";
import { UI_TEXT } from "@/constants/ui-text.constants";
import { useCoursePublishStates } from "@/hooks/use-course-publish-states";
import { HttpError } from "@/lib/http-client";
import { createCourse, deleteCourse, getCoursesList, updateCourse } from "@/services/course.service";
import { publishService } from "@/services/publish.service";
import { toast } from "@/services/toast.service";
import type { CourseItem, CreateCoursePayload } from "@/types/course.types";
import type { PublishIssue, PublishReportEntity } from "@/types/publish.types";

export function CoursesListView() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(DEFAULT_OPTIONS_LIMIT);

    // Modals state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState<CourseItem | null>(null);
    const [rpointCourse, setRpointCourse] = useState<CourseItem | null>(null);
    const [assignSemesterCourse, setAssignSemesterCourse] = useState<CourseItem | null>(null);
    const [publishCourse, setPublishCourse] = useState<CourseItem | null>(null);
    const [publishReport, setPublishReport] = useState<PublishReportEntity | null>(null);
    const [isPublishReportOpen, setIsPublishReportOpen] = useState(false);
    const [isPublishSuccess, setIsPublishSuccess] = useState(false);

    const { data: courses = [], isLoading } = useQuery({
        queryKey: ["courses", search],
        queryFn: () => getCoursesList(search),
    });

    const createMutation = useMutation({
        mutationFn: createCourse,
        onSuccess: () => {
            toast.success(UI_TEXT.common.successTitle, UI_TEXT.coursesList.toastCreateSuccess);
            queryClient.invalidateQueries({ queryKey: ["courses"] });
        },
        onError: (error: Error) => {
            toast.error(UI_TEXT.common.errorTitle, error.message || UI_TEXT.coursesList.toastCreateError);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: CreateCoursePayload }) => updateCourse(id, payload),
        onSuccess: () => {
            toast.success(UI_TEXT.common.successTitle, UI_TEXT.coursesList.toastUpdateSuccess);
            queryClient.invalidateQueries({ queryKey: ["courses"] });
        },
        onError: (error: Error) => {
            toast.error(UI_TEXT.common.errorTitle, error.message || UI_TEXT.coursesList.toastUpdateError);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteCourse,
        onSuccess: () => {
            toast.success(UI_TEXT.common.successTitle, UI_TEXT.coursesList.toastDeleteSuccess);
            queryClient.invalidateQueries({ queryKey: ["courses"] });
        },
        onError: (error: Error) => {
            toast.error(UI_TEXT.common.errorTitle, error.message || UI_TEXT.coursesList.toastDeleteError);
        },
    });

    const publishMutation = useMutation({
        mutationFn: (courseId: string) => publishService.publishCourse(courseId),
        onSuccess: (report, courseId) => {
            queryClient.invalidateQueries({ queryKey: [COURSE_PUBLISH_STATUS_QUERY_KEY, courseId] });
            setPublishReport(report ?? { errors: [], warnings: [] });
            setIsPublishSuccess(true);
            setIsPublishReportOpen(true);
        },
        onError: (error: unknown) => {
            // BE ném 422 khi học liệu đã lưu còn lỗi; filter lift `errors`/`warnings`
            // ra top-level (exception-filter.ts). Mọi lỗi khác chỉ báo toast.
            if (error instanceof HttpError && error.status === HTTP_STATUS_UNPROCESSABLE_ENTITY) {
                const payload = error.payload as { errors?: PublishIssue[]; warnings?: PublishIssue[] } | undefined;
                setPublishReport({ errors: payload?.errors ?? [], warnings: payload?.warnings ?? [] });
                setIsPublishSuccess(false);
                setIsPublishReportOpen(true);
            } else {
                toast.error(UI_TEXT.common.errorTitle, UI_TEXT.coursesPage.publishToastErrorDesc);
            }
        },
        onSettled: () => {
            setPublishCourse(null);
        },
    });

    const handleSearchChange = (val: string) => {
        setSearch(val);
        setPage(1);
    };

    const handleCreateClick = () => {
        setSelectedCourse(null);
        setIsFormOpen(true);
    };

    const handleEditClick = (course: CourseItem) => {
        setSelectedCourse(course);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (course: CourseItem) => {
        setCourseToDelete(course);
        setIsDeleteOpen(true);
    };

    const handleFormSubmit = async (payload: CreateCoursePayload) => {
        if (selectedCourse) {
            await updateMutation.mutateAsync({ id: selectedCourse.id, payload });
        } else {
            await createMutation.mutateAsync(payload);
        }
    };

    const handleConfirmDelete = async (id: string) => {
        await deleteMutation.mutateAsync(id);
    };

    const total = courses.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginatedCourses = courses.slice((page - 1) * limit, page * limit);
    const paginatedCourseIds = useMemo(() => paginatedCourses.map((item) => item.id), [paginatedCourses]);
    const publishStates = useCoursePublishStates(paginatedCourseIds);

    return (
        <div className="flex min-h-0 w-full flex-1 flex-col gap-6">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-xs">
                {/* Header Actions & Filter */}
                <div className="flex flex-col gap-4 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <SearchFilters search={search} onSearchChange={handleSearchChange} searchPlaceholder={UI_TEXT.coursesPage.searchPlaceholder} />
                    <button
                        type="button"
                        onClick={handleCreateClick}
                        className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-wine px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-wine/90 active:scale-95"
                    >
                        <Plus className="size-4.5" />
                        <span>{UI_TEXT.coursesPage.addCourse}</span>
                    </button>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full min-w-[650px] table-auto border-collapse text-left text-sm text-ink">
                        <thead>
                            <tr className="border-b border-line bg-slate-50/50 text-[11px] font-bold tracking-wider text-muted uppercase">
                                <th className="w-16 px-6 py-4 text-center">{UI_TEXT.coursesPage.thStt}</th>
                                <th className="w-48 px-6 py-4">{UI_TEXT.coursesPage.thCode}</th>
                                <th className="px-6 py-4">{UI_TEXT.coursesPage.thTitle}</th>
                                <th className="w-44 px-6 py-4 text-center">{UI_TEXT.coursesPage.thPublishStatus}</th>
                                <th className="w-48 px-6 py-4 text-center">{UI_TEXT.coursesPage.thActions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted">
                                        {UI_TEXT.coursesPage.loading}
                                    </td>
                                </tr>
                            ) : paginatedCourses.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted">
                                        {UI_TEXT.coursesPage.noDataTitle}
                                    </td>
                                </tr>
                            ) : (
                                paginatedCourses.map((item, index) => (
                                    <tr key={item.id} className="group transition duration-150 hover:bg-slate-50/80">
                                        <td className="border-b border-line px-6 py-4 text-center font-bold text-slate-400 group-last:border-b-0">
                                            {(page - 1) * limit + index + 1}
                                        </td>
                                        <td className="border-b border-line px-6 py-4 whitespace-nowrap group-last:border-b-0">
                                            <span className="inline-flex items-center rounded-lg border border-wine/10 bg-wine/5 px-2.5 py-1 font-mono text-xs font-bold whitespace-nowrap text-wine">
                                                {item.code}
                                            </span>
                                        </td>
                                        <td className="border-b border-line px-6 py-4 group-last:border-b-0">
                                            <div className="text-sm font-bold text-slate-900">{item.title}</div>
                                        </td>
                                        <td className="border-b border-line px-6 py-4 text-center whitespace-nowrap group-last:border-b-0">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${COURSE_PUBLISH_BADGE_CLASSES[publishStates[item.id]]}`}
                                                title={UI_TEXT.coursesPage.publishStatusTooltips[publishStates[item.id]]}
                                            >
                                                <span className={`size-1.5 rounded-full ${COURSE_PUBLISH_DOT_CLASSES[publishStates[item.id]]}`} />
                                                {UI_TEXT.coursesPage.publishStatusLabels[publishStates[item.id]]}
                                            </span>
                                        </td>
                                        <td className="border-b border-line px-6 py-4 text-center group-last:border-b-0">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Link
                                                    href={`/elearning/${item.id}` as Route}
                                                    className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-indigo-50 text-indigo-600 transition duration-200 hover:scale-105 hover:bg-indigo-600 hover:text-white"
                                                    title={UI_TEXT.coursesPage.elearningTooltip}
                                                >
                                                    <Eye className="size-4" />
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => setPublishCourse(item)}
                                                    className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-sky-50 text-sky-600 transition duration-200 hover:bg-sky-600 hover:text-white"
                                                    title={UI_TEXT.coursesPage.publishTooltip}
                                                >
                                                    <Send className="size-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAssignSemesterCourse(item)}
                                                    className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-purple-50 text-purple-600 transition duration-200 hover:bg-purple-600 hover:text-white"
                                                    title={UI_TEXT.coursesPage.assignSemesterTooltip}
                                                >
                                                    <CalendarPlus className="size-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRpointCourse(item)}
                                                    className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-amber-50 text-amber-700 transition duration-200 hover:bg-amber-500 hover:text-white"
                                                    title={UI_TEXT.coursesPage.rpointConfigTooltip}
                                                >
                                                    <Award className="size-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditClick(item)}
                                                    className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition duration-200 hover:bg-emerald-600 hover:text-white"
                                                    title={UI_TEXT.coursesPage.btnEdit}
                                                >
                                                    <Pencil className="size-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteClick(item)}
                                                    className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-600 hover:text-white"
                                                    title={UI_TEXT.coursesPage.btnDelete}
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {total > 0 && (
                    <TablePagination
                        total={total}
                        page={page}
                        totalPages={totalPages}
                        limit={limit}
                        onPageChange={(p) => setPage(p)}
                        onLimitChange={(l) => {
                            setLimit(l);
                            setPage(1);
                        }}
                        className="shrink-0 border-t border-line px-6 py-3.5"
                    />
                )}
            </div>

            {/* Modals */}
            <CourseFormModal isOpen={isFormOpen} onOpenChange={setIsFormOpen} initialData={selectedCourse} onSubmit={handleFormSubmit} />

            <CourseRpointConfigModal
                isOpen={!!rpointCourse}
                onOpenChange={(open) => {
                    if (!open) setRpointCourse(null);
                }}
                courseId={rpointCourse?.id || ""}
                courseTitle={rpointCourse?.title || ""}
            />

            <AssignCourseToSemesterModal
                isOpen={!!assignSemesterCourse}
                onOpenChange={(open) => {
                    if (!open) setAssignSemesterCourse(null);
                }}
                course={assignSemesterCourse}
            />

            <DeleteCourseModal isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen} course={courseToDelete} onConfirm={handleConfirmDelete} />

            <ConfirmModal
                isOpen={!!publishCourse}
                onClose={() => {
                    if (!publishMutation.isPending) setPublishCourse(null);
                }}
                onConfirm={() => {
                    if (publishCourse) publishMutation.mutate(publishCourse.id);
                }}
                title={UI_TEXT.coursesPage.publishConfirmTitle}
                message={UI_TEXT.coursesPage.publishConfirmMessage}
                confirmText={UI_TEXT.coursesPage.publishConfirmBtn}
                cancelText={UI_TEXT.coursesPage.publishCancelBtn}
                isLoading={publishMutation.isPending}
            />

            <PublishReportModal
                isOpen={isPublishReportOpen}
                onOpenChange={setIsPublishReportOpen}
                report={publishReport}
                isPublishSuccess={isPublishSuccess}
                title={isPublishSuccess ? UI_TEXT.publishReportModal.defaultTitle : UI_TEXT.publishReportModal.publishFailedTitle}
            />
        </div>
    );
}
