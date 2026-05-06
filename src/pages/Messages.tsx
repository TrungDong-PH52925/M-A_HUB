import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, onSnapshot, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Card, Button } from '../components/ui';
import { Send, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface Chat {
  id: string;
  participants: string[];
  updatedAt: string;
  lastMessage?: string;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export default function Messages() {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [usersInfo, setUsersInfo] = useState<Record<string, any>>({});
  
  // Load chats
  useEffect(() => {
    if (!user) return;
    
    const fetchChats = async () => {
      try {
        let chatQuery;
        if (profile?.role === 'admin' || profile?.role === 'advisor') {
          chatQuery = query(collection(db, 'chats'), orderBy('updatedAt', 'desc'));
        } else {
          chatQuery = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', user.uid)
          );
        }
        
        const unsubscribe = onSnapshot(chatQuery, async (snapshot) => {
          const chatList: Chat[] = [];
          const uids = new Set<string>();
          
          snapshot.forEach(doc => {
            const data = doc.data() as Chat;
            chatList.push({ id: doc.id, ...data });
            data.participants.forEach(p => uids.add(p));
          });
          
          // Fetch user details for display
          const info: Record<string, any> = { ...usersInfo };
          for (const uid of uids) {
            if (!info[uid] && uid !== user.uid) {
              const udoc = await getDoc(doc(db, 'users', uid));
              if (udoc.exists()) {
                info[uid] = udoc.data();
              }
            }
          }
          setUsersInfo(info);
          
          chatList.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          setChats(chatList);
          setLoading(false);
        });
        
        return () => unsubscribe();
      } catch (err) {
        console.error("Error fetching chats:", err);
        setLoading(false);
      }
    };
    
    fetchChats();
  }, [user, profile]);

  // Load messages for a selected chat
  useEffect(() => {
    if (!selectedChat) return;
    
    const msgQuery = query(
      collection(db, `chats/${selectedChat.id}/messages`),
      orderBy('createdAt', 'asc')
    );
    
    const unsubscribe = onSnapshot(msgQuery, (snapshot) => {
      const msgList: Message[] = [];
      snapshot.forEach(doc => {
        msgList.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgList);
    });
    
    return () => unsubscribe();
  }, [selectedChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedChat || !newMessage.trim()) return;
    
    try {
      const text = newMessage;
      setNewMessage('');
      
      const now = new Date().toISOString();
      await addDoc(collection(db, `chats/${selectedChat.id}/messages`), {
        senderId: user.uid,
        text,
        createdAt: now
      });
      
      await updateDoc(doc(db, 'chats', selectedChat.id), {
        updatedAt: now,
        lastMessage: text
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-24 min-h-[calc(100vh-80px)] flex gap-6">
      <Card className="w-1/3 flex flex-col overflow-hidden h-[70vh]">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-lg">{language === 'vi' ? 'Tin nhắn' : 'Messages'}</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-4 text-slate-500">Loading...</p>
          ) : chats.length === 0 ? (
            <p className="p-4 text-slate-500">{language === 'vi' ? 'Chưa có tin nhắn nào.' : 'No messages yet.'}</p>
          ) : (
            chats.map(chat => {
              const otherUserIds = chat.participants.filter(p => p !== user.uid);
              const otherUserNames = otherUserIds.map(uid => usersInfo[uid]?.name || 'Unknown').join(', ');
              
              return (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`w-full text-left p-4 border-b border-slate-50 transition-colors ${selectedChat?.id === chat.id ? 'bg-indigo-50 border-indigo-100' : 'hover:bg-slate-50'}`}
                >
                  <div className="font-bold text-slate-900 truncate">{otherUserNames || (language === 'vi' ? 'Hỗ trợ' : 'Support')}</div>
                  {chat.lastMessage && (
                    <div className="text-sm text-slate-500 truncate mt-1">{chat.lastMessage}</div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </Card>
      
      <Card className="w-2/3 flex flex-col overflow-hidden h-[70vh]">
        {!selectedChat ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            {language === 'vi' ? 'Chọn một cuộc trò chuyện' : 'Select a conversation'}
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-slate-100 bg-slate-50 shadow-sm z-10 font-bold">
              {selectedChat.participants.filter(p => p !== user.uid).map(uid => usersInfo[uid]?.name || 'User').join(', ')}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 relative">
              {messages.map(msg => {
                const isMe = msg.senderId === user.uid;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3 rounded-2xl ${isMe ? 'bg-slate-900 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-900 rounded-bl-none shadow-sm'}`}>
                      <p className="text-sm">{msg.text}</p>
                      <span className={`text-[10px] opacity-70 mt-1 block ${isMe ? 'text-slate-300 text-right' : 'text-slate-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder={language === 'vi' ? 'Nhập tin nhắn...' : 'Type a message...'}
                className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-slate-900 transition-colors"
              />
              <Button type="submit" disabled={!newMessage.trim()} className="w-14 items-center justify-center p-0 flex">
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
