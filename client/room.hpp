// Header for the room data structure
// Lauren Smith

#ifndef JAZZ_ROOM_HPP
#define JAZZ_ROOM_HPP

#include <string>

class Message;
class Server;

class Room
{
public:
  Room(const std::string& roomName_param, const std::string& roomDesc_param, Server* serverPointer_param, int roomID_param, const std::string& roomPass_param = ""):
    roomName(roomName_param), roomDesc(roomDesc_param), serverPointer(serverPointer_param), roomID(roomID_param), roomPass(roomPass_param),
    oldestLoaded(nullptr), newestLoaded(nullptr), oldestUnseen(nullptr) {}
  ~Room();

  void setOldestLoaded(Message* older);
  void setNewestLoaded(Message* newer);
  void setOldestUnseen(Message* oldUnseen);
  bool setRoomPass(std::string password);

  int getRoomID() const;
  Message* getOldestLoaded() const;
  Message* getNewestLoaded() const;
  Message* getOldestUnseen() const;
  std::string getRoomName() const;
  std::string getRoomDesc() const;
  Server* getServerPointer() const;
  std::string getRoomPass() const;

  Message* loadMoreTop(int amount);
  void appendNewMessage(Message* newMessage);
  
  
private:
  std::string roomName; // 64 char limit
  std::string roomDesc; // 512 char limit
  std::string roomPass;
  int roomID;
  Message* oldestLoaded;
  Message* newestLoaded;
  Message* oldestUnseen;
  Server* serverPointer;
  
};

#endif
