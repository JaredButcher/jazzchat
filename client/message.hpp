// Header for the message data structure
// Lauren Smith

#ifndef JAZZ_MESSAGE_HPP
#define JAZZ_MESSAGE_HPP

#include <string>

class Room;

class Message
{
public:
  Message(const std::string& messageContent_param, unsigned long timestamp_param, unsigned long messageID_param, Room* roomLocation_param, const std::string& username_param):
    messageContent(messageContent_param), timestamp(timestamp_param), messageID(messageID_param), roomLocation(roomLocation_param), username(username_param), prevMessage(nullptr), nextMessage(nullptr) {}
  ~Message();

  void setPrevMessage(Message* prev);
  void setNextMessage(Message* next);

  void setPrev(Message* prev) { setPrevMessage(prev); }
  void setNext(Message* next) { setNextMessage(next); }
  
  Message* getPrevMessage() const;
  Message* getNextMessage() const;
  std::string getMessageContent() const;
  unsigned long getTimestamp() const; // TODO: Time Library
  unsigned long getMessageID() const;
  Room* getRoomLocation() const;
  std::string getUsername() const;

  // TODO: TTS Integration?

private:
  Message* prevMessage;
  Message* nextMessage;
  std::string messageContent; // 2048 char limit
  unsigned long timestamp;
  unsigned long messageID;
  Room* roomLocation;
  std::string username;
};


#endif
