# A2A Tool (`a2a`)

This document describes the `a2a` tool for the Gemini CLI.

## Description

Use `a2a` to send messages to other Gemini CLI agents and receive responses. The A2A (Agent-to-Agent) tool enables communication between different Gemini CLI instances running on different machines or environments, allowing for distributed collaboration and task delegation.

The `a2a` tool implements a standardized Agent-to-Agent communication protocol using JSON-RPC 2.0 over HTTP. It supports automatic endpoint discovery and handles both immediate message responses and asynchronous task execution.

### Arguments

`a2a` takes the following arguments:

- `url` (string, required): The base URL of the target agent to send the message to (e.g., `http://localhost:8888` or `https://agent.example.com`).
- `message` (string, required): The message content to send to the target agent. This should be a clear, natural language instruction or question.

## How to use `a2a` with the Gemini CLI

The `a2a` tool communicates with other Gemini CLI agents using a standardized protocol:

1. **Endpoint Discovery**: The tool attempts to discover the agent's A2A endpoint by fetching `/.well-known/agent.json` from the target URL. If discovery fails, it falls back to using the base URL directly.

2. **Message Transmission**: The tool sends a JSON-RPC 2.0 request containing the user's message formatted as an agent message.

3. **Response Processing**: The target agent can respond with either:
   - A **Message**: Direct response with text content
   - A **Task**: Asynchronous task with status information (e.g., `submitted`, `working`, `completed`, `failed`)

4. **Result Formatting**: The tool formats the response appropriately and returns it to the user.

Usage:

```
a2a(url="http://localhost:8888", message="Can you analyze the logs in /var/log/app.log?")
```

## `a2a` examples

Send a task to a remote agent:

```
a2a(url="https://build-agent.company.com", message="Please run the CI/CD pipeline for the latest commit on the main branch")
```

Ask another agent for information:

```
a2a(url="http://192.168.1.100:8888", message="What's the current status of the database migration?")
```

Delegate file analysis to a specialized agent:

```
a2a(url="http://security-agent:8889", message="Please scan the uploaded files for vulnerabilities and generate a security report")
```

Request code review from a peer agent:

```
a2a(url="http://reviewer.local:8888", message="Can you review the changes in the src/auth/ directory and provide feedback?")
```

## Important notes

- **Protocol Compatibility**: Both agents must support the A2A protocol specification for communication to work properly.
- **Network Requirements**: A2A requires network connectivity between agents. Ensure proper network configuration and security policies.
- **Authentication**: The current implementation does not include authentication. Consider implementing authentication mechanisms for production deployments.
- **Asynchronous Tasks**: When the receiving agent returns a Task response, it indicates the operation is running asynchronously. You may need to check back with the agent for task completion status.
- **Sandboxing**: Like all Gemini CLI tools, A2A operations are subject to sandboxing restrictions when enabled.
