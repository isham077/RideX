import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { cn } from "../lib/utils";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface GroqMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

const searchRidesFunction = {
  type: "function",
  function: {
    name: "search_rides",
    description: "Search for available rides between source and destination locations.",
    parameters: {
      type: "object",
      properties: {
        source: { type: "string", description: "The starting point of the ride." },
        destination: { type: "string", description: "The destination of the ride." },
      },
      required: ["source", "destination"],
    },
  },
};

const getRideDetailsFunction = {
  type: "function",
  function: {
    name: "get_ride_details",
    description: "Get full details of a specific ride by its ID.",
    parameters: {
      type: "object",
      properties: {
        rideId: { type: "string", description: "The unique ID of the ride." },
      },
      required: ["rideId"],
    },
  },
};

const listAllRidesFunction = {
  type: "function",
  function: {
    name: "list_all_rides",
    description: "List all available rides currently offered on the platform.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
};

const getUserDetailsFunction = {
  type: "function",
  function: {
    name: "get_user_details",
    description: "Get details about a specific user (driver or passenger) by their UID.",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "The unique ID of the user." },
      },
      required: ["userId"],
    },
  },
};

const getRideBookingsFunction = {
  type: "function",
  function: {
    name: "get_ride_bookings",
    description: "Get all bookings associated with a specific ride ID.",
    parameters: {
      type: "object",
      properties: {
        rideId: { type: "string", description: "The unique ID of the ride." },
      },
      required: ["rideId"],
    },
  },
};

const getMyRidesFunction = {
  type: "function",
  function: {
    name: "get_my_rides",
    description: "Get the current user's rides (both as a driver and as a passenger).",
    parameters: {
      type: "object",
      properties: {},
    },
  },
};

export const ChatBot: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const callGroq = async (messages: GroqMessage[], tools?: any[]) => {
    try {
      const response = await axios.post("/api/chat", { messages, tools });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || "Failed to call Groq API");
    }
  };

  const handleSend = async () => {
    const userQuery = input.trim();
    if (!userQuery || isLoading) return;

    const userMessage: Message = { role: "user", content: userQuery };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const systemPrompt: GroqMessage = {
        role: "system",
        content: `You are 'RideAI', the intelligent virtual assistant for RIDE X.
        
        CRITICAL RULES:
        1. ONLY provide information found in the database via your tools.
        2. NEVER hallucinate or make up ride IDs, prices, or locations.
        3. If a tool returns no results, EXPLICITLY state that no such rides or data were found.
        4. Do NOT say "I've found a ride..." if the tool returned an empty list.
        5. Use 'list_all_rides' to see what's available if a specific search fails.
        6. Always use 'search_rides' when a user asks for a route.
        7. Use 'get_my_rides' to see rides the user has created or joined.

        User Context:
        - UID: ${user?.uid || "Anonymous"}
        - Email: ${user?.email || "N/A"}

        Formatting Guidelines:
        - Use Markdown for structure.
        - **Bold** prices and status.
        - Bullet points for lists.
        - Tables for comparisons of more than 2 rides.`
      };

      const tools = [
        searchRidesFunction, 
        getRideDetailsFunction, 
        listAllRidesFunction, 
        getUserDetailsFunction, 
        getRideBookingsFunction,
        getMyRidesFunction
      ];
      
      const groqMessages: GroqMessage[] = [
        systemPrompt,
        ...messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        { role: "user", content: userQuery }
      ];

      let response = await callGroq(groqMessages, tools);
      let choice = response.choices[0];
      let message = choice.message;
      
      let finalMessage = message.content || "";

      // Handle tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolMessages: GroqMessage[] = [
          ...groqMessages,
          message
        ];

        for (const toolCall of message.tool_calls) {
          const { name, arguments: argsString } = toolCall.function;
          const args = JSON.parse(argsString);
          let result;
          
          if (name === "search_rides") {
            const ridesRef = collection(db, "rides");
            const q = query(
              ridesRef,
              where("status", "==", "pending")
            );
            const querySnapshot = await getDocs(q);
            const allPendingRides = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
            
            const searchSource = args.source.toLowerCase();
            const searchDest = args.destination.toLowerCase();
            
            result = allPendingRides.filter(ride => {
              const rideSource = (ride.source || "").toLowerCase();
              const rideDest = (ride.destination || "").toLowerCase();
              const hasSeats = (ride.seatsAvailable === undefined || ride.seatsAvailable > 0);
              
              return hasSeats && (
                rideSource.includes(searchSource) && 
                rideDest.includes(searchDest)
              );
            });
          } else if (name === "get_ride_details") {
            const rideDoc = await getDoc(doc(db, "rides", args.rideId));
            result = rideDoc.exists() ? { id: rideDoc.id, ...rideDoc.data() } : { error: "Ride not found" };
          } else if (name === "list_all_rides") {
            const ridesRef = collection(db, "rides");
            const q = query(ridesRef, where("status", "==", "pending"));
            const querySnapshot = await getDocs(q);
            result = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
          } else if (name === "get_user_details") {
            const userDoc = await getDoc(doc(db, "users", args.userId));
            result = userDoc.exists() ? { uid: userDoc.id, ...userDoc.data() } : { error: "User not found" };
          } else if (name === "get_ride_bookings") {
            const bookingsRef = collection(db, "bookings");
            const q = query(bookingsRef, where("rideId", "==", args.rideId));
            const querySnapshot = await getDocs(q);
            result = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
          } else if (name === "get_my_rides") {
            if (!user) {
              result = { error: "User not authenticated" };
            } else {
              const ridesRef = collection(db, "rides");
              const bookingsRef = collection(db, "bookings");

              // 1. Get rides where user is driver
              const driverQuery = query(ridesRef, where("driverId", "==", user.uid));
              const driverSnap = await getDocs(driverQuery);
              const driverRides = driverSnap.docs.map(doc => ({ id: doc.id, role: "driver", ...doc.data() }));

              // 2. Get bookings where user is passenger
              const passengerQuery = query(bookingsRef, where("passengerId", "==", user.uid));
              const passengerSnap = await getDocs(passengerQuery);
              const passengerBookings = passengerSnap.docs.map(doc => doc.data());

              // 3. Get rides for those bookings
              const passengerRides = [];
              for (const booking of passengerBookings) {
                const rideDoc = await getDoc(doc(db, "rides", booking.rideId));
                if (rideDoc.exists()) {
                  passengerRides.push({ id: rideDoc.id, role: "passenger", bookingStatus: booking.status, ...rideDoc.data() });
                }
              }

              result = {
                asDriver: driverRides,
                asPassenger: passengerRides
              };
            }
          }

          toolMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: name,
            content: JSON.stringify(result)
          });
        }

        const secondResponse = await callGroq(toolMessages);
        finalMessage = secondResponse.choices[0].message.content || "";
      }

      const aiMessage: Message = {
        role: "assistant",
        content: finalMessage || "I'm sorry, I couldn't process that request."
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);
      let errorMessage = "Sorry, I encountered an error. Please try again later.";
      
      if (error.message.includes("GROQ_API_KEY")) {
        errorMessage = "API Key missing. Please add GROQ_API_KEY to your Secrets.";
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
        
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMessage }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-80 md:w-96 h-[500px] bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-zinc-800 border-b border-zinc-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Bot size={18} className="text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">RideAI Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">Online</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.length === 0 && (
                <div className="text-center py-10 space-y-4">
                  <Bot size={40} className="mx-auto text-zinc-700" />
                  <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">
                    How can I help you today?
                  </p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex gap-3 max-w-[85%]",
                    msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1",
                    msg.role === "user" ? "bg-blue-500/20" : "bg-emerald-500/20"
                  )}>
                    {msg.role === "user" ? <User size={12} className="text-blue-500" /> : <Bot size={12} className="text-emerald-500" />}
                  </div>
                  <div className={cn(
                    "p-3 rounded-2xl text-sm leading-relaxed overflow-hidden",
                    msg.role === "user" 
                      ? "bg-blue-600 text-white rounded-tr-none" 
                      : "bg-zinc-800 text-zinc-200 rounded-tl-none"
                  )}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-700 prose-ul:list-disc prose-ol:list-decimal">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 mr-auto">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-1">
                    <Bot size={12} className="text-emerald-500" />
                  </div>
                  <div className="bg-zinc-800 p-3 rounded-2xl rounded-tl-none">
                    <Loader2 size={16} className="text-emerald-500 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-800">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-2 p-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-all"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all",
          isOpen ? "bg-zinc-800 text-white" : "bg-emerald-600 text-white hover:bg-emerald-500"
        )}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </motion.button>
    </div>
  );
};
