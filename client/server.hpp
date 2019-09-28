// Header for the Server connection data structure
// Lauren Smith
#ifndef JAZZ_SERVER_HPP
#define JAZZ_SERVER_HPP

#include <string>
#include <utility>
#include <unordered_map>

class Message;
class Room;

class Server
{
public:
  Server(const std::string& ipAddress_param): //TODO: connect to server with an api
    ipAddress(ipAddress_param), serverName(""), roomCollection() {};
  ~Server();

  std::string getIPAddress() const;
  std::string getServerName() const;
  std::unordered_map<int, Room*>::iterator getRoomIterator();

  void requestRooms();
  std::pair<Message*,Message*> requestMessageData(Room* where, int amount = 50, unsigned long startMessage = 0, bool requestFromBack = true);
  
  
private:
  std::string ipAddress;
  std::string serverName;
  std::unordered_map<int, Room*> roomCollection;
};

#endif
