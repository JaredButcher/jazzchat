// Implementation file for Jazz Room
// Lauren Smith

#include "server.hpp"
#include "room.hpp"
#include "message.hpp"
#include <string>

using std::string;

Room::~Room()
{
  delete newestLoaded;
}

void Room::setOldestLoaded(Message* older)
{
  oldestLoaded = older;
}

void Room::setNewestLoaded(Message* newer)
{
  newestLoaded = newer;
}

void Room::setOldestUnseen(Message* oldUnseen)
{
  oldestUnseen = oldUnseen;
}

bool Room::setRoomPass(string password)
{
  roomPass = password;
  // do password check
  return true;
}

int Room::getRoomID() const
{
  return roomID;
}

Message* Room::getOldestLoaded() const
{
  return oldestLoaded;
}

Message* Room::getNewestLoaded() const
{
  return newestLoaded;
}

Message* Room::getOldestUnseen() const
{
  return oldestUnseen;
}

string Room::getRoomName() const
{
  return roomName;
}

std::string Room::getRoomDesc() const
{
  return roomDesc;
}

Server* Room::getServerPointer() const
{
  return serverPointer;
}

std::string Room::getRoomPass() const
{
  return roomPass;
}

Message* Room::loadMoreTop(int amount = 50)
{
  unsigned long startMessage = oldestLoaded->getMessageID() - 1;
  auto messages = serverPointer->requestMessageData(this, amount, startMessage);
  oldestLoaded->setPrev(messages.second);
  messages.second->setNext(oldestLoaded);
  oldestLoaded = messages.first;
  return messages.second;
}

void Room::appendNewMessage(Message* newMessage)
{
  newestLoaded->setNext(newMessage);
  newMessage->setPrev(newMessage);
  newestLoaded = newMessage;

  if(oldestUnseen == nullptr)
    oldestUnseen = newMessage;
}

