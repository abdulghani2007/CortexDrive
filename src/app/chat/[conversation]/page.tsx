import React from 'react';
import { useParams } from 'next/navigation';

export default function ConversationPage() {
  const params = useParams();
  const id = params?.conversation;
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Conversation</h1>
      <div id="chat-root" data-conversation-id={id}></div>
      <script dangerouslySetInnerHTML={{ __html: `/* client script mounts chat widget */` }} />
    </div>
  );
}
