import { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";

import ChatMessage from "./ChatMessage";
import Button from "./Button";
import SuggestedPrompt from "./SuggestedPrompt";

import { getChatStreamResponse } from "../utils/apiAccess";

import styles from "./ChatBox.module.css";

import BounceLoader from "react-spinners/BounceLoader";

function ChatBox({ sourceTag }) {
    const [messages, setMessages] = useState([]);
    const userInputRef = useRef(null);
    const chatBottomRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [currentUpdate, setCurrentUpdate] = useState("");


    const addMessage = newMessage => {
        setMessages(m => [...m, newMessage]);
    };

    useEffect(() => {
        addMessage({ sender: "system", contents: `Category changed to ${sourceTag}` });
    }, [sourceTag]);

    // scrolls to the bottom of the chat box
    useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // moved to own function
    const sendMessage = async () => {
        const messageContents = userInputRef.current.value.trim();
        if(!messageContents) return;

        addMessage({ sender: "user", contents: messageContents });
        userInputRef.current.value = "";
        setLoading(true);

        try {
            const messageIterator = getChatStreamResponse(messageContents, sourceTag.toLowerCase());
            for await (const message of messageIterator) {
                if(message.message_type === "update") {
                    setCurrentUpdate(message.message_content);
                } else if(message.message_type === "final_response") {
                    addMessage({ sender: "ai", contents: message.message_content });
                } else if(message.message_type === "error") {
                    addMessage({ sender: "system", contents: `Error: ${message.message_content}` });
                } else {
                    console.log("Unknown message received:", message);
                }
            }
        } catch(error) {
            addMessage({ sender: "ai", contents: "Sorry, I'm unable to provide an answer to this question." });
        } finally {
            setLoading(false);
        }

    };

    const handleInputSubmission = event => {
        if(event.key !== "Enter") return;
        sendMessage();
    };

    const handleInputClear = event => {
        if(event.key !== "Enter") return;
        userInputRef.current.value = "";
    };

    const chooseSuggestion = suggestionText => {
        userInputRef.current.value = suggestionText;
        sendMessage();
    };


    return (
        <>
            <div className={styles.chatBox}>

                <div className={styles.messageBox}>
                    <div className={styles.suggestionContainer}>
                        <div className={styles.suggestion_col}>
                            <SuggestedPrompt contents="What is an Amazon Alexa for business?" onClick={chooseSuggestion}> </SuggestedPrompt>
                            {/* <SuggestedPrompt contents="What is an EU directive?" onClick={chooseSuggestion}> </SuggestedPrompt> */}
                        </div>
                        <div className={styles.suggestion_col}>
                            <SuggestedPrompt contents="What is an EU directive?" onClick={chooseSuggestion}> </SuggestedPrompt>
                            {/* <SuggestedPrompt contents="Who are you?" onClick={chooseSuggestion}> </SuggestedPrompt> */}
                        </div>
                    </div>

                    { messages.map((msg, index) =>
                        <ChatMessage sender={msg.sender} contents={msg.contents} key={index} />
                    ) }
                    <div ref={chatBottomRef} className={loading ? styles.bottomContainerLoading : ""} />
                </div>

                { loading &&
                    <div className={styles.spinner}>
                        <BounceLoader
                            size="3em"
                            color="white"
                            loading={loading}
                            speedMultiplier="1"
                        />
                        <div>{ currentUpdate }</div>
                    </div>
                }

                <div className={styles.inputContainer} >
                    <textarea
                        name="chatInput"
                        rows="1"
                        placeholder="Type your query and hit enter..."
                        className={styles.chatInputField}
                        onKeyDown={handleInputSubmission}
                        onKeyUp={handleInputClear}
                        ref={userInputRef}
                    />
                    <Button text="↑" onClick={sendMessage} className={styles.sendButton} />
                </div>

            </div>
        </>
    );
}

ChatBox.propTypes = {
    sourceTag: PropTypes.string.isRequired
};

export default ChatBox;
