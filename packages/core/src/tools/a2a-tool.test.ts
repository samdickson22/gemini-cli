/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const mockSendMessage = vi.hoisted(() => vi.fn());
const mockUUID = 'd8ea048c-a612-4318-abec-1f237207b8e6';

vi.mock('node:crypto', () => ({
  randomUUID: () => mockUUID,
}));

vi.mock('../a2a/client.js', () => ({
  A2AClient: vi.fn().mockImplementation(() => ({
    sendMessage: mockSendMessage,
  })),
}));

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { A2ATool } from './a2a-tool.js';
import { Task } from '../a2a/types.js';
import { ToolConfirmationOutcome } from './tools.js';

describe('A2ATool', () => {
  let tool: A2ATool;

  beforeEach(() => {
    // Reset mocks before each test
    mockSendMessage.mockClear();
    tool = new A2ATool();
  });

  it('should call the A2A client and format the response', async () => {
    const mockResponse: Task = {
      kind: 'task',
      id: 'task-123',
      contextId: 'context-456',
      status: {
        state: 'completed',
      },
      history: [
        {
          kind: 'message',
          role: 'agent',
          parts: [{ kind: 'text', text: 'hello back' }],
        },
      ],
    };
    mockSendMessage.mockResolvedValue(mockResponse);

    const result = await tool.execute({
      url: 'http://localhost:8888',
      message: 'Hello, agent!',
    });

    // Verify that sendMessage was called with the correct payload.
    expect(mockSendMessage).toHaveBeenCalledWith({
      message: {
        messageId: mockUUID,
        role: 'user',
        parts: [{ kind: 'text', text: 'Hello, agent!' }],
      },
    });

    // Check that the tool returns the formatted response including context and message.
    expect(result.llmContent).toContain('Task ID: task-123');
    expect(result.llmContent).toContain('Context: context-456');
    expect(result.llmContent).toContain('Status: completed');
    expect(result.llmContent).toContain('Message: hello back');

    // shouldConfirmExecute behaviour
    const confirm = await tool.shouldConfirmExecute(
      { url: 'http://localhost:8888', message: 'Hello' },
      new AbortController().signal,
    );
    expect(confirm).not.toBe(false);
    // Simulate user approving permanently
    if (confirm && typeof confirm === 'object' && 'onConfirm' in confirm) {
      await confirm.onConfirm(ToolConfirmationOutcome.ProceedAlways);
    }
    // Second call should return false (allowlisted)
    const confirm2 = await tool.shouldConfirmExecute(
      { url: 'http://localhost:8888', message: 'Hello' },
      new AbortController().signal,
    );
    expect(confirm2).toBe(false);
  });
});
