import { GoogleGenAI } from '@google/genai';
import { ITrack } from '@/models/Settings';

// Initialize the Gemini SDK. 
// Note: You must ensure GEMINI_API_KEY is set in your .env.local file.
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Helper function to evaluate the parsed presentation text.
 * Expects a structured JSON response matching the IAIEvaluation interface.
 */
export async function evaluatePresentationWithGemini(presentationText: string, trackSettings: ITrack | null = null) {

  // Base Default Criteria
  let criteriaString = `
    { "criterion": "Innovation", "score": number (0-10), "reasoning": "string" },
    { "criterion": "Technical Feasibility", "score": number (0-10), "reasoning": "string" },
    { "criterion": "Completeness", "score": number (0-10), "reasoning": "string" }
  `;
  let maxPossibleScore = 30;
  let requiredSlidesString = `'Tech Stack', 'Business Model', etc.`;
  let additionalInstructions = '';

  // Apply Track Overrides
  if (trackSettings) {
    if (trackSettings.rubrics && trackSettings.rubrics.length > 0) {
      maxPossibleScore = trackSettings.rubrics.reduce((sum, r) => sum + (Number(r.weightage) || 10), 0) || 10;
      criteriaString = trackSettings.rubrics.map((r: { criterion: string; weightage: number; description?: string }) =>
        `    { "criterion": "${r.criterion}", "score": number (0-${r.weightage}), "reasoning": "string (Consider: ${r.description || ''})" }`
      ).join(',\n');
    }
    if (trackSettings.requiredSlides && trackSettings.requiredSlides.length > 0) {
      requiredSlidesString = trackSettings.requiredSlides.map((s: string) => `'${s}'`).join(', ');
      additionalInstructions += `\nCRITICAL: You MUST explicitly check if these specific slides/sections exist: [${requiredSlidesString}]. If ANY are missing, log them exactly in 'missingSections'.`;
    }
  }

  const prompt = `
You are an expert Hackathon Judge and Senior Software Engineer evaluating a project submission. 
Based on the text extracted from the team's presentation below, evaluate the project.
${additionalInstructions}

Furthermore, check for IDEA PLAGIARISM or CLICHE: Utilize your worldly knowledge to determine if this idea is a highly common unoriginal hackathon cliche (e.g. "blockchain medical records") or directly copied from famous past winners or standard open source tutorials. Base this strictly on originality.

Provide a strict JSON response containing the following structure:
{
  "totalScore": number (Normalized overall score from 0 to 100 based on the criteria scores out of ${maxPossibleScore}),
  "summaryForJudges": string (A concise 1-paragraph summary of the project),
  "criteriaScores": [
${criteriaString}
  ],
  "missingSections": [ "string" (List exactly which items from the required list are completely missing, or empty array) ],
  "strengths": [ "string" ],
  "weaknesses": [ "string" ],
  "plagiarismFlag": boolean (true if highly derivative/cliche/plagiarized, false if reasonably original),
  "plagiarismWarning": string or null (If plagiarismFlag is true, briefly explain why. e.g. "This is a generic cliche project that has been built many times before (Blockchain Medical Records)")
}

Presentation Text:
"""
${presentationText}
"""
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    if (response.text) {
      const cleaned = response.text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      const parsed = JSON.parse(cleaned);
      // Normalize totalScore consistently onto a 0-100 scale from criteriaScores when available
      if (Array.isArray(parsed.criteriaScores) && parsed.criteriaScores.length > 0 && maxPossibleScore > 0) {
        const sum = parsed.criteriaScores.reduce((acc: number, c: { score?: number }) => acc + (Number(c.score) || 0), 0);
        parsed.totalScore = Math.max(0, Math.min(100, Math.round((sum / maxPossibleScore) * 100)));
      } else if (typeof parsed.totalScore === 'number') {
        parsed.totalScore = Math.max(0, Math.min(100, Math.round(parsed.totalScore)));
      }
      return parsed;
    }
    throw new Error('No text returned from Gemini API');
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

/**
 * Helper function to evaluate the team's GitHub codebase.
 */
export async function evaluateCodebaseWithGemini(githubContext: string) {
  const prompt = `
You are a Senior Software Engineer evaluating a hackathon team's codebase. 
Based on the text scraped from the team's GitHub repository below, evaluate their technical implementation.

Provide a strict JSON response containing the following structure:
{
  "githubAnalysis": {
    "technicalComplexity": number (0-100),
    "codeQuality": "string (Short assessment of their tech stack / README quality)",
    "commitActivity": "string (Short assessment of effort)"
  }
}

Github Repository Data Context:
"""
${githubContext}
"""
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    if (response.text) {
      const cleaned = response.text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      return JSON.parse(cleaned);
    }
    throw new Error('No text returned from Gemini API');
  } catch (error) {
    console.error('Error calling Gemini codebase API:', error);
    throw error;
  }
}
