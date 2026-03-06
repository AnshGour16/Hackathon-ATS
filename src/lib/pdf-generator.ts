import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Using a slightly looser type to prevent ESLint explicit-any errors while still allowing nested property access in jsPDF
export async function generateFeedbackPDF(team: Record<string, unknown> | null, evaluation: Record<string, unknown>) {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(50, 50, 150);
    doc.text('Hackathon ATS Feedback Report', 20, 20);

    // Team Info
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text(`Team: ${(team?.name as string) || 'Unknown'}`, 20, 35);
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`Problem Statement: ${(team?.problemStatement as string) || 'N/A'}`, 20, 42);

    // Score Box
    doc.setDrawColor(139, 92, 246);
    doc.setFillColor(243, 232, 255);
    doc.roundedRect(150, 25, 40, 25, 3, 3, 'FD');
    doc.setFontSize(12);
    doc.setTextColor(139, 92, 246);
    doc.text('ATS Score', 155, 33);
    doc.setFontSize(22);
    doc.text(`${(evaluation.totalScore as number) || 0}/100`, 155, 45);

    // Summary
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text('AI Executive Summary', 20, 60);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);

    const splitSummary = doc.splitTextToSize((evaluation.summaryForJudges as string) || 'No summary available.', 170);
    doc.text(splitSummary, 20, 68);

    const finalY = 68 + (splitSummary.length * 5); // Rough height calculation

    // Criteria Table
    let currentY = finalY + 10;
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text('Evaluation Criteria Breakdown', 20, currentY);

    const tableData = (evaluation.criteriaScores as unknown[] | undefined)?.map((crit: unknown) => {
        const c = crit as { criterion: string; score: number; reasoning: string };
        return [
            c.criterion,
            `${c.score}/10`,
            c.reasoning
        ];
    }) || [];

    autoTable(doc, {
        startY: currentY + 5,
        head: [['Criterion', 'Score', 'Feedback / Reasoning']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246] },
        columnStyles: {
            0: { cellWidth: 40, fontStyle: 'bold' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 'auto' }
        }
    });

    currentY = ((doc as unknown) as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

    // Strengths & Weaknesses side by side
    doc.setFontSize(14);
    doc.setTextColor(34, 197, 94); // Green
    doc.text('Key Strengths', 20, currentY);

    doc.setTextColor(239, 68, 68); // Red
    doc.text('Areas for Improvement', 110, currentY);

    doc.setFontSize(10);
    currentY += 8;

    const strengths = evaluation.strengths || [];
    const weaknesses = evaluation.weaknesses || [];
    const missing = evaluation.missingSections || [];

    // Draw Strengths
    doc.setTextColor(60, 60, 60);
    let strY = currentY;
    (strengths as string[]).forEach((str: string) => {
        const lines = doc.splitTextToSize(`• ${str}`, 80);
        doc.text(lines, 20, strY);
        strY += (lines.length * 5);
    });

    // Draw Weaknesses & Missing
    doc.setTextColor(60, 60, 60);
    let weakY = currentY;
    [...(weaknesses as string[]), ...(missing as string[]).map((m: string) => `Missing: ${m}`)].forEach((weak: string) => {
        const lines = doc.splitTextToSize(`• ${weak}`, 80);
        doc.text(lines, 110, weakY);
        weakY += (lines.length * 5);
    });

    // Save the PDF
    const teamNameStr = (team?.name as string) || 'Team';
    doc.save(`${teamNameStr.replace(/\s+/g, '_')}_Feedback_Report.pdf`);
}
