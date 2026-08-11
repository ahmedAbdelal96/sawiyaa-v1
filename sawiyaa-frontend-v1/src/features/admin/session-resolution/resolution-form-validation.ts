export function getResolutionFormBlocker(input: { finding: string; reasonCode: string; notes: string; patientRemedy: string; replacementStart: string; hasPreview: boolean; previewMatches: boolean }, isAr = false) {
  const notesRequired = input.finding === "OTHER" || input.reasonCode === "OTHER";
  if (notesRequired && !input.notes.trim()) return isAr ? "أدخل ملاحظة توضيحية لأنك اخترت سبباً آخر." : "Add an explanation because you selected Other.";
  if (input.patientRemedy === "CREATE_REPLACEMENT_SESSION" && !input.replacementStart) return isAr ? "اختر موعد الجلسة البديلة للمتابعة." : "Choose a replacement start time to continue.";
  if (!input.hasPreview) return isAr ? "عاين تأثير القرار أولاً." : "Preview the decision impact first.";
  if (!input.previewMatches) return isAr ? "تم تغيير القرار — حدّث المعاينة قبل التنفيذ." : "Decision changed — refresh the preview before executing.";
  return null;
}
