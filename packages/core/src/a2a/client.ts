/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { fetch } from 'undici';
import type {
  A2AClientConfig,
  Agent,
  MessageSendParams,
  Message,
  Task,
  JSONRPCRequest,
  JSONRPCResponse,
} from './types.js';

export class A2AClient {
  private readonly config: A2AClientConfig;

  constructor(config: A2AClientConfig) {
    this.config = config;
  }

  async sendMessage(params: MessageSendParams): Promise<Task | Message> {
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'message/send',
      params: params as Record<string, unknown>,
    };

    const response = await this.sendRequest(request);

    if (response.error) {
      throw new Error(
        `A2A Error ${response.error.code}: ${response.error.message}`,
      );
    }

    const result = response.result;
    if (!this.isTaskOrMessage(result)) {
      throw new Error('Invalid response format: expected Task or Message');
    }

    return result;
  }

  private async discoverEndpoint(): Promise<string> {
    const url = new URL(this.config.baseUrl);
    url.pathname = '/.well-known/agent.json';

    try {
      const response = await fetch(url.toString());
      if (response.ok) {
        const agent = (await response.json()) as Agent;
        return agent.a2a.url;
      }
    } catch (e) {
      // Fall through to using the base URL.
    }

    return this.config.baseUrl;
  }

  private async sendRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    const endpoint = await this.discoverEndpoint();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(
        `Request failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<JSONRPCResponse>;
  }

  private isTask(value: unknown): value is Task {
    return (
      typeof value === 'object' &&
      value !== null &&
      'kind' in value &&
      value.kind === 'task'
    );
  }

  private isMessage(value: unknown): value is Message {
    return (
      typeof value === 'object' &&
      value !== null &&
      'kind' in value &&
      value.kind === 'message'
    );
  }

  private isTaskOrMessage(value: unknown): value is Task | Message {
    return this.isTask(value) || this.isMessage(value);
  }
}
