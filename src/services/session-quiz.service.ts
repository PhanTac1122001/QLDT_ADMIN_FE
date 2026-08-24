import { API_ENDPOINTS } from "@/constants/api-endpoints.constants";
import { DEFAULT_OPTIONS_LIMIT, DEFAULT_PAGE_SIZE } from "@/constants/options.constants";
import { SESSION_QUIZ_TEMPLATE_FILENAME } from "@/constants/quiz.constants";
import { httpClient } from "@/lib/http-client";
import { HttpMethod } from "@/types/api-types";
import type {
    CreateSessionQuizPayload,
    ImportExcelResponse,
    QuerySessionQuizParams,
    SessionQuizItem,
    SessionQuizListResponse,
    UpdateSessionQuizPayload,
} from "@/types/session-quiz.types";
import { downloadFileFromApi } from "@/utils/download.utils";

export async function getSessionQuizzes(params: QuerySessionQuizParams = {}): Promise<SessionQuizListResponse> {
    const searchParams = new URLSearchParams();
    if (params.educationProgramId) searchParams.set("educationProgramId", params.educationProgramId);
    if (params.subjectId) searchParams.set("subjectId", params.subjectId);
    if (params.sessionId) searchParams.set("sessionId", params.sessionId);
    if (params.search) searchParams.set("search", params.search);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));

    const queryString = searchParams.toString();
    const url = queryString ? `${API_ENDPOINTS.SESSION_QUIZ.BASE}?${queryString}` : API_ENDPOINTS.SESSION_QUIZ.BASE;

    const res = await httpClient<any>(url, { method: HttpMethod.GET });
    const result = res?.data ?? res;
    if (result?.items && Array.isArray(result.items)) {
        return {
            items: result.items,
            total: result.total ?? result.items.length,
            page: result.page ?? (params.page || 1),
            limit: result.limit ?? (params.limit || DEFAULT_PAGE_SIZE),
        };
    }
    const items = Array.isArray(result) ? result : [];
    return {
        items,
        total: items.length,
        page: params.page || 1,
        limit: params.limit || DEFAULT_OPTIONS_LIMIT,
    };
}

export async function getSessionQuizById(id: string): Promise<SessionQuizItem> {
    const res = await httpClient<any>(API_ENDPOINTS.SESSION_QUIZ.BY_ID(id), {
        method: HttpMethod.GET,
    });
    return res?.data || res;
}

export async function createSessionQuiz(payload: CreateSessionQuizPayload): Promise<SessionQuizItem> {
    const res = await httpClient<any>(API_ENDPOINTS.SESSION_QUIZ.BASE, {
        method: HttpMethod.POST,
        body: JSON.stringify(payload),
    });
    return res?.data || res;
}

export async function updateSessionQuiz(id: string, payload: UpdateSessionQuizPayload): Promise<SessionQuizItem> {
    const res = await httpClient<any>(API_ENDPOINTS.SESSION_QUIZ.BY_ID(id), {
        method: HttpMethod.PUT,
        body: JSON.stringify(payload),
    });
    return res?.data || res;
}

export async function deleteSessionQuiz(id: string): Promise<void> {
    await httpClient<void>(API_ENDPOINTS.SESSION_QUIZ.BY_ID(id), {
        method: HttpMethod.DELETE,
    });
}

export async function importExcelQuestions(file: File): Promise<ImportExcelResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await httpClient<any>(API_ENDPOINTS.SESSION_QUIZ.IMPORT_EXCEL, {
        method: HttpMethod.POST,
        body: formData,
    });
    return res?.data || res;
}

export async function downloadExcelTemplate(): Promise<void> {
    return downloadFileFromApi(API_ENDPOINTS.SESSION_QUIZ.EXCEL_TEMPLATE, SESSION_QUIZ_TEMPLATE_FILENAME);
}
