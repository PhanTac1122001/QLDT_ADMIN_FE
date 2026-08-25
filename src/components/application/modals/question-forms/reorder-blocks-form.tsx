"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { UI_TEXT } from "@/constants/ui-text.constants";
import type { ReorderBlocksFormProps } from "@/types/exam-set.types";

export function ReorderBlocksForm({ blocks, onBlocksChange }: ReorderBlocksFormProps) {
    const handleContentChange = (blockId: string, value: string) => {
        onBlocksChange(blocks.map((block) => (block.id === blockId ? { ...block, content: value } : block)));
    };

    const handleAddBlock = () => {
        onBlocksChange([...blocks, { id: `block_new_${Date.now()}`, content: "" }]);
    };

    const handleRemoveBlock = (blockId: string) => {
        onBlocksChange(blocks.filter((block) => block.id !== blockId));
    };

    // Đổi vị trí bằng cách swap với phần tử liền kề — KHÔNG dùng thư viện kéo-thả
    // (quyết định đã chốt), nút lên/xuống dùng được bằng bàn phím.
    const handleMoveUp = (index: number) => {
        if (index === 0) {
            return;
        }
        const next = [...blocks];
        const [moved] = next.splice(index, 1);
        next.splice(index - 1, 0, moved);
        onBlocksChange(next);
    };

    const handleMoveDown = (index: number) => {
        if (index === blocks.length - 1) {
            return;
        }
        const next = [...blocks];
        const [moved] = next.splice(index, 1);
        next.splice(index + 1, 0, moved);
        onBlocksChange(next);
    };

    return (
        <div className="flex flex-col gap-2.5">
            <label className="text-[12.5px] font-bold text-slate-700">{UI_TEXT.examsSetsEl.labelReorderBlocksList}</label>
            <p className="text-[12px] text-slate-500">{UI_TEXT.examsSetsEl.hintReorderIsAnswerOrder}</p>

            <div className="flex flex-col gap-2">
                {blocks.map((block, index) => (
                    <div key={block.id} className="flex items-center gap-3">
                        <span className="w-6 shrink-0 text-center text-xs font-bold text-slate-500">{index + 1}</span>
                        <input
                            type="text"
                            value={block.content}
                            onChange={(e) => handleContentChange(block.id, e.target.value)}
                            placeholder={UI_TEXT.examsSetsEl.placeholderReorderBlock}
                            className="w-full flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-[13px] font-medium text-slate-800 focus:border-wine focus:ring-1 focus:ring-wine focus:outline-none"
                        />
                        {/* Nút lên/xuống PHẢI disabled ở đầu/cuối danh sách, không ẩn đi — ẩn làm
                            layout nhảy mỗi khi di chuyển, rất khó thao tác. Dùng `title` native
                            (không dùng component Tooltip) vì Tooltip chỉ hoạt động với con là
                            phần tử focusable của react-aria, bọc <button> thuần sẽ không hiện. */}
                        <button
                            type="button"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            title={UI_TEXT.examsSetsEl.btnMoveBlockUp}
                            aria-label={UI_TEXT.examsSetsEl.btnMoveBlockUp}
                            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            <ArrowUp className="size-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === blocks.length - 1}
                            title={UI_TEXT.examsSetsEl.btnMoveBlockDown}
                            aria-label={UI_TEXT.examsSetsEl.btnMoveBlockDown}
                            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            <ArrowDown className="size-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleRemoveBlock(block.id)}
                            aria-label={UI_TEXT.examsSetsEl.btnRemoveReorderBlock}
                            title={UI_TEXT.examsSetsEl.btnRemoveReorderBlock}
                            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-wine"
                        >
                            <Trash2 className="size-3.5" />
                        </button>
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={handleAddBlock}
                className="flex w-fit items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
                <Plus className="size-3.5" />
                {UI_TEXT.examsSetsEl.btnAddReorderBlock}
            </button>
        </div>
    );
}
