import { API_ENDPOINTS } from "@/constants/api-endpoints.constants";
import { QUIZ_TEMPLATE_FILENAME } from "@/constants/quiz.constants";
import { httpClient } from "@/lib/http-client";
import { HttpMethod } from "@/types/api-types";
import type { CreateQuizPayload, QuizBackendEntity, QuizImportExcelResponse, UpdateQuizPayload } from "@/types/quiz.types";
import { downloadFileFromApi } from "@/utils/download.utils";

export async function getQuizzes(courseId?: string): Promise<QuizBackendEntity[]> {
    const url = courseId ? `${API_ENDPOINTS.QUIZ.BASE}?courseId=${courseId}` : API_ENDPOINTS.QUIZ.BASE;
    const res = await httpClient<any>(url, { method: HttpMethod.GET });
    return res?.data || res || [];
}

export async function getQuizById(id: string): Promise<QuizBackendEntity> {
    const res = await httpClient<any>(API_ENDPOINTS.QUIZ.BY_ID(id), { method: HttpMethod.GET });
    return res?.data || res;
}

export async function createQuiz(payload: CreateQuizPayload): Promise<QuizBackendEntity> {
    const res = await httpClient<any>(API_ENDPOINTS.QUIZ.BASE, {
        method: HttpMethod.POST,
        body: JSON.stringify(payload),
    });
    return res?.data || res;
}

export async function updateQuiz(id: string, payload: UpdateQuizPayload): Promise<QuizBackendEntity> {
    const res = await httpClient<any>(API_ENDPOINTS.QUIZ.BY_ID(id), {
        method: HttpMethod.PUT,
        body: JSON.stringify(payload),
    });
    return res?.data || res;
}

export async function deleteQuiz(id: string): Promise<void> {
    await httpClient<void>(API_ENDPOINTS.QUIZ.BY_ID(id), {
        method: HttpMethod.DELETE,
    });
}

export async function importQuizExcel(file: File): Promise<QuizImportExcelResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await httpClient<any>(API_ENDPOINTS.QUIZ.IMPORT_EXCEL, {
        method: HttpMethod.POST,
        body: formData,
    });
    return res?.data || res;
}

export async function downloadQuizExcelTemplate(): Promise<void> {
    return downloadFileFromApi(API_ENDPOINTS.QUIZ.EXCEL_TEMPLATE, QUIZ_TEMPLATE_FILENAME);
}
