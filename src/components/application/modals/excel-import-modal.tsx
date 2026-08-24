"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Upload, X } from "lucide-react";
import { Heading } from "react-aria-components";
import { Button } from "@/components/base/buttons/button";
import { CustomModal, Dialog } from "@/components/ui/custom-modal";
import { UI_TEXT } from "@/constants/ui-text.constants";
import { downloadStudentTemplate, importStudentsExcel } from "@/services/student.service";
import { toast } from "@/services/toast.service";
import type { ExcelImportModalProps } from "@/types/student.types";

export function ExcelImportModal({ isOpen, onClose, systems }: ExcelImportModalProps) {
    const queryClient = useQueryClient();
    const [systemId, setSystemId] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<{ inserted: number; updated: number } | null>(null);

    const importMutation = useMutation({
        mutationFn: () => {
            if (!systemId || !file) throw new Error(UI_TEXT.excelImportModal.errMissingSystemOrFile);
            return importStudentsExcel(systemId, file);
        },
        onSuccess: (data) => {
            setResult(data);
            toast.success(UI_TEXT.excelImportModal.toastSuccessTitle, UI_TEXT.excelImportModal.toastSuccessDesc);
            queryClient.invalidateQueries({ queryKey: ["students-list"] });
        },
        onError: (e: Error) => {
            toast.error(UI_TEXT.excelImportModal.toastErrorTitle, e.message || UI_TEXT.excelImportModal.toastErrorDefault);
        },
    });

    const handleClose = () => {
        setFile(null);
        setSystemId("");
        setResult(null);
        onClose();
    };

    const handleDownloadTemplate = async () => {
        try {
            await downloadStudentTemplate();
            toast.success(UI_TEXT.excelImportModal.toastDownloadTitle, UI_TEXT.excelImportModal.toastDownloadSuccess);
        } catch {
            toast.error(UI_TEXT.excelImportModal.toastDownloadTitle, UI_TEXT.excelImportModal.toastDownloadError);
        }
    };

    return (
        <CustomModal.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <CustomModal.Content className="w-full max-w-md !rounded-[24px]">
                <Dialog className="flex flex-col rounded-[24px] bg-white p-6 shadow-2xl outline-none">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <Heading slot="title" className="text-lg font-black text-slate-800">
                            {UI_TEXT.excelImportModal.title}
                        </Heading>
                        <button onClick={handleClose} className="rounded-lg p-1 hover:bg-slate-100">
                            <X className="size-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="mt-4 flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase">{UI_TEXT.excelImportModal.defaultSystemLabel}</label>
                            <select
                                value={systemId}
                                onChange={(e) => setSystemId(e.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                            >
                                <option value="">{UI_TEXT.excelImportModal.selectSystemPlaceholder}</option>
                                {systems.map((sys) => (
                                    <option key={sys.id} value={sys.id}>
                                        {sys.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Đặt trên vùng chọn file: người dùng cần biết cấu trúc cột TRƯỚC khi soạn file. */}
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5">
                            <span className="text-xs text-slate-500">{UI_TEXT.excelImportModal.downloadTemplateHint}</span>
                            <button
                                type="button"
                                onClick={handleDownloadTemplate}
                                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-wine/30 bg-white px-3 py-1.5 text-xs font-bold text-wine transition hover:bg-wine/5"
                            >
                                <Download className="size-3.5" />
                                {UI_TEXT.excelImportModal.downloadTemplateBtn}
                            </button>
                        </div>

                        <div className="relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center transition hover:border-wine">
                            <Upload className="size-8 text-slate-400" />
                            <span className="text-sm font-semibold text-slate-700">{UI_TEXT.excelImportModal.dragDropHint}</span>
                            <span className="text-xs text-slate-400">{UI_TEXT.excelImportModal.acceptFileTypeHint}</span>
                            <input
                                type="file"
                                accept=".xlsx"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 cursor-pointer opacity-0"
                            />
                        </div>

                        {file && (
                            <div className="rounded bg-slate-100 p-2 font-mono text-xs text-slate-500">
                                {UI_TEXT.excelImportModal.fileSelectedPrefix}
                                {file.name}
                            </div>
                        )}

                        {result && (
                            <div className="flex flex-col gap-1 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                                <div className="font-bold">{UI_TEXT.excelImportModal.resultTitle}</div>
                                <div>
                                    {UI_TEXT.excelImportModal.addedCountPrefix}
                                    <span className="font-bold">{result.inserted}</span> {UI_TEXT.excelImportModal.studentSuffix}
                                </div>
                                <div>
                                    {UI_TEXT.excelImportModal.updatedCountPrefix}
                                    <span className="font-bold">{result.updated}</span> {UI_TEXT.excelImportModal.studentSuffix}
                                </div>
                            </div>
                        )}

                        <div className="mt-4 flex justify-end gap-3 border-t border-slate-100 pt-4">
                            <Button color="secondary" type="button" onClick={handleClose}>
                                {UI_TEXT.excelImportModal.closeBtn}
                            </Button>
                            <Button
                                color="primary"
                                onClick={() => importMutation.mutate()}
                                isLoading={importMutation.isPending}
                                isDisabled={!systemId || !file}
                                className="border-none bg-wine text-white"
                            >
                                {UI_TEXT.excelImportModal.uploadBtn}
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </CustomModal.Content>
        </CustomModal.Root>
    );
}
