/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as crypto from 'node:crypto';
import {
  BaseTool,
  type ToolResult,
  ToolCallConfirmationDetails,
  ToolConfirmationOutcome,
} from './tools.js';
import { A2AClient } from '../a2a/client.js';
import { Message, Part, Task } from '../a2a/types.js';

const INFO = {
  name: 'a2a',
  displayName: 'A2A',
  description: 'Sends a message to another agent and returns the response.',
  parameterSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL of the agent to send the message to.',
      },
      message: {
        type: 'string',
        description: 'The message to send to the agent.',
      },
      contextId: {
        type: 'string',
        description:
          'Optional context ID to continue an existing conversation with the remote agent.',
      },
    },
    required: ['url', 'message'],
  },
};

type A2AToolParams = { url: string; message: string; contextId?: string };

export class A2ATool extends BaseTool<A2AToolParams, ToolResult> {
  // Allowlist of hosts the user has permanently approved.
  private static readonly allowlist: Set<string> = new Set();
  constructor() {
    super(INFO.name, INFO.displayName, INFO.description, INFO.parameterSchema);
  }

  async shouldConfirmExecute(
    params: A2AToolParams,
    _abortSignal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false> {
    const host = (() => {
      try {
        return new URL(params.url).host;
      } catch {
        return params.url; // fallback – treat raw string as key
      }
    })();

    if (A2ATool.allowlist.has(host)) {
      return false;
    }

    const confirmation: ToolCallConfirmationDetails = {
      type: 'info',
      title: 'Confirm A2A Call',
      prompt: `Send message "${params.message}" to ${params.url}`,
      urls: [params.url],
      onConfirm: async (outcome: ToolConfirmationOutcome) => {
        if (outcome === ToolConfirmationOutcome.ProceedAlways) {
          A2ATool.allowlist.add(host);
        }
      },
    };

    return confirmation;
  }

  async execute(params: A2AToolParams): Promise<ToolResult> {
    const client = new A2AClient({ baseUrl: params.url });
    const response = await client.sendMessage({
      message: {
        messageId: crypto.randomUUID(),
        role: 'user',
        parts: [{ kind: 'text', text: params.message }],
        ...(params.contextId ? { contextId: params.contextId } : {}),
      },
    });

    const llmContent = this.formatResponse(response);
    const returnDisplay = `Received response: ${llmContent}`;

    return { llmContent, returnDisplay };
  }

  private formatResponse(response: Task | Message): string {
    // Helper to extract text parts from a message
    const getTextFromMessage = (msg: Message | undefined): string => {
      if (!msg) return '';
      return msg.parts
        .map((part: Part) => {
          if (part.kind === 'text') return part.text;
          if (part.kind === 'file')
            return `[file: ${part.file.name} (${part.file.mimeType})]`;
          return '';
        })
        .filter(Boolean)
        .join(' ');
    };

    if (response.kind === 'task') {
      const bits: string[] = [`Task ID: ${response.id}`];
      if (response.contextId) bits.push(`Context: ${response.contextId}`);
      bits.push(`Status: ${response.status.state}`);

      const terminalStates = ['completed', 'failed', 'canceled'];
      if (terminalStates.includes(response.status.state)) {
        const message = response.status.message ?? response.history?.at(-1);
        const text = getTextFromMessage(message);
        if (text) bits.push(`Message: ${text}`);
      }

      if (response.artifacts && response.artifacts.length > 0) {
        const names = response.artifacts.map((a) => a.name ?? a.artifactId);
        bits.push(
          `Artifacts (${response.artifacts.length}): ${names.join(', ')}`,
        );
      }

      return bits.join(', ');
    }

    // response.kind !== 'task' → Message
    return getTextFromMessage(response as Message);
  }
}
