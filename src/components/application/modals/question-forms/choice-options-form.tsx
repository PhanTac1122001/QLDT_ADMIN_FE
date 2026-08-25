"use client";

import { Check, Circle } from "lucide-react";
import { UI_TEXT } from "@/constants/ui-text.constants";
import type { ChoiceOptionsFormProps } from "@/types/exam-set.types";
import { cx } from "@/utils/cx";

export function ChoiceOptionsForm({ options, isMulti, onSelectCorrect, onOptionTextChange }: ChoiceOptionsFormProps) {
    return (
        <div className="flex flex-col gap-2.5">
            <label className="text-[12.5px] font-bold text-slate-700">{UI_TEXT.examsSetsEl.labelAnswersList}</label>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {options.map((opt, index) => (
                    <div
                        key={opt.id}
                        className={cx(
                            "relative flex cursor-pointer flex-col gap-3.5 rounded-2xl border p-4.5 transition duration-150 focus-within:ring-1",
                            opt.isCorrect
                                ? "border-emerald-500 bg-emerald-50/20 shadow-xs shadow-emerald-50 focus-within:border-emerald-500 focus-within:ring-emerald-500"
                                : "border-slate-200 bg-white focus-within:border-wine focus-within:ring-wine hover:border-slate-800",
                        )}
                        onClick={() => onSelectCorrect(index)}
                    >
                        {/* Choice Card Header */}
                        <div className="pointer-events-none flex items-center justify-between select-none">
                            <div className="flex items-center gap-2">
                                <div className="relative flex items-center justify-center">
                                    {opt.isCorrect ? (
                                        <div
                                            className={cx(
                                                "flex size-5 items-center justify-center bg-emerald-500 text-white",
                                                isMulti ? "rounded-md" : "rounded-full",
                                            )}
                                        >
                                            <Check className="size-3.5 stroke-[3] text-white" />
                                        </div>
                                    ) : isMulti ? (
                                        <div className="size-5 rounded-md border-2 border-slate-300 bg-white" />
                                    ) : (
                                        <Circle className="size-5 text-slate-400" />
                                    )}
                                </div>
                            </div>
                            <span className={cx("text-xs font-bold", opt.isCorrect ? "text-emerald-700" : "text-slate-400")}>
                                {opt.isCorrect ? UI_TEXT.examsSetsEl.labelCorrect : UI_TEXT.examsSetsEl.labelIncorrect}
                            </span>
                        </div>

                        {/* Choice Card Input */}
                        <textarea
                            rows={2}
                            value={opt.text}
                            onChange={(e) => onOptionTextChange(index, e.target.value)}
                            onClick={(e) => e.stopPropagation()} // Avoid triggering correct-selection click when typing
                            placeholder={UI_TEXT.examsSetsEl.placeholderAnswer}
                            className="w-full resize-none border-none bg-transparent p-0 text-[13px] leading-relaxed font-semibold text-slate-700 placeholder-slate-400 focus:outline-none"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
