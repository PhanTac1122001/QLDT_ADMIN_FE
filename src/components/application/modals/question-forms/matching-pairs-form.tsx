"use client";

import { Plus, Trash2 } from "lucide-react";
import { UI_TEXT } from "@/constants/ui-text.constants";
import type { MatchingPairsFormProps } from "@/types/exam-set.types";

export function MatchingPairsForm({ pairs, onPairsChange }: MatchingPairsFormProps) {
    const handleLeftChange = (pairId: string, value: string) => {
        onPairsChange(pairs.map((pair) => (pair.id === pairId ? { ...pair, left: value } : pair)));
    };

    const handleRightChange = (pairId: string, value: string) => {
        onPairsChange(pairs.map((pair) => (pair.id === pairId ? { ...pair, right: value } : pair)));
    };

    const handleAddPair = () => {
        onPairsChange([...pairs, { id: `pair_new_${Date.now()}`, left: "", right: "" }]);
    };

    const handleRemovePair = (pairId: string) => {
        onPairsChange(pairs.filter((pair) => pair.id !== pairId));
    };

    return (
        <div className="flex flex-col gap-2.5">
            <label className="text-[12.5px] font-bold text-slate-700">{UI_TEXT.examsSetsEl.labelMatchingPairsList}</label>

            <div className="flex gap-3 px-1">
                <span className="flex-1 text-[11.5px] font-semibold text-slate-500">{UI_TEXT.examsSetsEl.labelMatchingLeftColumn}</span>
                <span className="flex-1 text-[11.5px] font-semibold text-slate-500">{UI_TEXT.examsSetsEl.labelMatchingRightColumn}</span>
                <span className="w-7 shrink-0" />
            </div>

            <div className="flex flex-col gap-2">
                {pairs.map((pair) => (
                    <div key={pair.id} className="flex items-center gap-3">
                        <input
                            type="text"
                            value={pair.left}
                            onChange={(e) => handleLeftChange(pair.id, e.target.value)}
                            placeholder={UI_TEXT.examsSetsEl.placeholderMatchingLeft}
                            className="w-full flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-[13px] font-medium text-slate-800 focus:border-wine focus:ring-1 focus:ring-wine focus:outline-none"
                        />
                        <input
                            type="text"
                            value={pair.right}
                            onChange={(e) => handleRightChange(pair.id, e.target.value)}
                            placeholder={UI_TEXT.examsSetsEl.placeholderMatchingRight}
                            className="w-full flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-[13px] font-medium text-slate-800 focus:border-wine focus:ring-1 focus:ring-wine focus:outline-none"
                        />
                        <button
                            type="button"
                            onClick={() => handleRemovePair(pair.id)}
                            aria-label={UI_TEXT.examsSetsEl.btnRemoveMatchingPair}
                            title={UI_TEXT.examsSetsEl.btnRemoveMatchingPair}
                            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-wine"
                        >
                            <Trash2 className="size-3.5" />
                        </button>
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={handleAddPair}
                className="flex w-fit items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
                <Plus className="size-3.5" />
                {UI_TEXT.examsSetsEl.btnAddMatchingPair}
            </button>
        </div>
    );
}
