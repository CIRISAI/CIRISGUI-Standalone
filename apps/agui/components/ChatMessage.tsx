'use client';

import React from 'react';
import { ConversationMessage, MessageType, getMessageType } from '@/lib/ciris-sdk/types';

interface ChatMessageProps {
  message: ConversationMessage;
  className?: string;
}

/**
 * Message type styling configuration
 */
const MESSAGE_STYLES: Record<MessageType, {
  containerClass: string;
  bubbleClass: string;
  headerClass: string;
  icon?: React.ReactNode;
  defaultAuthor: string;
}> = {
  user: {
    containerClass: 'justify-end',
    bubbleClass: 'bg-blue-600 text-white',
    headerClass: 'text-blue-100',
    defaultAuthor: 'You',
  },
  agent: {
    containerClass: 'justify-start',
    bubbleClass: 'bg-white border border-gray-200 text-gray-900',
    headerClass: 'text-gray-500',
    defaultAuthor: 'CIRIS',
  },
  system: {
    containerClass: 'justify-center',
    bubbleClass: 'bg-blue-50 border border-blue-200 text-blue-800',
    headerClass: 'text-blue-600',
    icon: (
      <svg className="w-4 h-4 mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    defaultAuthor: 'System',
  },
  error: {
    containerClass: 'justify-center',
    bubbleClass: 'bg-red-50 border border-red-200 text-red-800',
    headerClass: 'text-red-600',
    icon: (
      <svg className="w-4 h-4 mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    defaultAuthor: 'Error',
  },
};

/**
 * ChatMessage component for rendering conversation messages with type-based styling.
 * Supports user, agent, system, and error message types with backwards compatibility.
 */
export function ChatMessage({ message, className = '' }: ChatMessageProps) {
  const messageType = getMessageType(message);
  const style = MESSAGE_STYLES[messageType];

  const displayAuthor = message.author || style.defaultAuthor;
  const formattedTime = new Date(message.timestamp).toLocaleTimeString();

  return (
    <div className={`flex ${style.containerClass} ${className}`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${style.bubbleClass}`}>
        <div className={`text-xs mb-1 ${style.headerClass}`}>
          {style.icon}
          {displayAuthor} • {formattedTime}
        </div>
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
}

/**
 * ChatMessageList component for rendering a list of messages.
 * Handles empty states and loading.
 */
interface ChatMessageListProps {
  messages: ConversationMessage[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function ChatMessageList({
  messages,
  isLoading = false,
  emptyMessage = 'No messages yet. Start a conversation!',
  className = ''
}: ChatMessageListProps) {
  if (isLoading) {
    return (
      <div className={`text-center text-gray-500 ${className}`}>
        Loading conversation...
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={`text-center text-gray-500 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {messages.map((msg, idx) => (
        <ChatMessage key={msg.id || idx} message={msg} />
      ))}
    </div>
  );
}

export default ChatMessage;
