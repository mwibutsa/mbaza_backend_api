import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { AiCategory } from '../common/enums/ai-category.enum';
import { CaseUrgency } from '../common/enums/case-urgency.enum';
import * as fs from 'fs';

export interface ExtractedData {
  name?: string;
  location?: {
    district?: string;
    sector?: string;
    cell?: string;
    village?: string;
  };
  issueLocation?: {
    district?: string;
    sector?: string;
    cell?: string;
    village?: string;
  };
  issue?: string;
  category?: AiCategory;
  urgency?: CaseUrgency;
}

export interface AiResponse {
  extractedData: ExtractedData;
  nextQuestion: string; // Kinyarwanda text to speak
  isComplete: boolean; // True if we have Name, Location, and Issue
  transcript: string; // Full transcript so far
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  // Global Concurrency Control
  private static activeRequests = 0;
  private static readonly MAX_CONCURRENT = 2; // Keep it low to avoid 429s

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Based on list-models.ts diagnostic, 'gemini-flash-latest' is a confirmed valid name.
    const modelName = 'gemini-2.0-flash';
    this.logger.log(`Initializing Gemini model: ${modelName}`);
    this.model = this.genAI.getGenerativeModel({
      model: modelName,
    });
  }

  /**
   * Process the user's audio turn with exponential backoff and concurrency control.
   */
  async processTurn(
    audioBuffer: Buffer,
    currentContext: ExtractedData = {},
  ): Promise<AiResponse> {
    // Wait for slot (Simple busy-wait for now, can use a proper queue if needed)
    while (GeminiService.activeRequests >= GeminiService.MAX_CONCURRENT) {
      const waitJitter = Math.floor(Math.random() * 500) + 200;
      await new Promise((resolve) => setTimeout(resolve, waitJitter));
    }

    GeminiService.activeRequests++;
    this.logger.log(
      `Processing audio turn (${audioBuffer.length} bytes). Active requests: ${GeminiService.activeRequests}`,
    );

    try {
      const audioBase64 = audioBuffer.toString('base64');
      const prompt = `
        You are a compassionate call center agent for "Mbaza", a citizen reporting platform in Rwanda.
        You are processing a recording of a citizen reporting an issue.
        
        Your Goal: 
        1. Transcribe the entire audio accurately.
        2. Extract the citizen's Name.
        3. Extract the citizen's Residence (District, Sector, Cell, Village).
        4. Extract the Issue Location (District, Sector, Cell, Village) - this may be different from their residence.
        5. Extract the Issue description.
        6. Classify the issue into exactly one of these categories: 'Land registration', 'Civil status changes', 'Waste management', 'Illegal constructions', 'Other'.
        7. Determine the urgency: 'low', 'medium', 'high', or 'critical'.

        Response Schema:
        {
          "extractedData": {
             "name": string | null,
             "location": { "district": string | null, "sector": string | null, "cell": string | null, "village": string | null },
             "issueLocation": { "district": string | null, "sector": string | null, "cell": string | null, "village": string | null },
             "issue": string | null,
             "category": "Land registration" | "Civil status changes" | "Waste management" | "Illegal constructions" | "Other" | null,
             "urgency": "low" | "medium" | "high" | "critical" | null
          },
          "transcript": string, // The full transcription of the entire recording
          "isComplete": boolean // True if we have Name, Residence (Location), and Issue
        }

        Return valid JSON only.
      `;

      let retries = 0;
      const maxRetries = 3;
      let delay = 2000;

      while (retries <= maxRetries) {
        try {
          const result = await this.model.generateContent([
            prompt,
            {
              inlineData: {
                mimeType: 'audio/wav',
                data: audioBase64,
              },
            },
          ]);

          const responseText = result.response.text();
          this.logger.debug(`Gemini Raw Response: ${responseText}`);

          const firstBrace = responseText.indexOf('{');
          const lastBrace = responseText.lastIndexOf('}');
          if (firstBrace === -1 || lastBrace === -1) {
            throw new Error('No JSON found in response');
          }
          const jsonStr = responseText.substring(firstBrace, lastBrace + 1);

          const parsed = JSON.parse(jsonStr) as AiResponse;
          this.logger.log(`Gemini response: ${JSON.stringify(parsed)}`);

          return parsed;
        } catch (error: any) {
          const isRateLimit =
            error?.status === 429 ||
            error?.message?.includes('429') ||
            error?.message?.includes('Resource has been exhausted');

          if (isRateLimit && retries < maxRetries) {
            // Add jitter to delay
            const jitter = Math.floor(Math.random() * 1000) - 500;
            const finalDelay = Math.max(500, delay + jitter);

            this.logger.warn(
              `Gemini Rate Limit (429). Retrying in ${finalDelay}ms (Attempt ${retries + 1}/${maxRetries})`,
            );
            await new Promise((resolve) => setTimeout(resolve, finalDelay));
            retries++;
            delay *= 2;
            continue;
          }
          throw error;
        }
      }
      throw new Error('Max retries reached for Gemini request');
    } catch (error: any) {
      this.logger.error('Gemini processing failed', error);
      if (error instanceof Error) {
        fs.appendFileSync(
          'gemini_debug.log',
          `[${new Date().toISOString()}] ERROR: ${error.message}\n${error.stack}\n`,
        );
      }

      return {
        extractedData: currentContext,
        nextQuestion:
          'I am sorry, I did not catch that. Could you please repeat?',
        isComplete: false,
        transcript: '',
      };
    } finally {
      GeminiService.activeRequests--;
    }
  }
}
