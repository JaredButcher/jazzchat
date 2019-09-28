// Implementation of the header data structure.
// Lauren Smith

#include "message.hpp"
#include <string>

using std::string;

Message::~Message()
{
  if(prevMessage != nullptr)
    delete prevMessage;
}

void Message::setPrevMessage(Message* prev)
{
  prevMessage = prev;
}

void Message::setNextMessage(Message* next)
{
  nextMessage = next;
}

Message* Message::getPrevMessage() const
{
  return prevMessage;
}

Message* Message::getNextMessage() const
{
  return nextMessage;
}

string Message::getMessageContent() const
{
  return messageContent;
}

unsigned long Message::getTimestamp() const
{
  return timestamp;
}

unsigned long Message::getMessageID() const
{
  return messageID;
}

Room* Message::getRoomLocation() const
{
  return roomLocation;
}

std::string Message::getUsername() const
{
  return username;
}
