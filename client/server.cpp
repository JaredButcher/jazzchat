// Implementation of server connection
// Lauren Smith

#include "server.hpp"
#include "room.hpp"
#include "message.hpp"
#include <string>
#include <utility>
#include <cpprest/http_client.h>
#include <cpprest/json.h>
#include <cpprest/uri.h>
#include <cpprest/ws_client.h>
#include <sstream>
#include <iostream>

using namespace utility;                    // Common utilities like string conversions
using namespace web;                        // Common features like URIs.

using std::string;

Server::~Server()
{
  for(auto curr: roomCollection)
    delete curr.second;
  
}

string Server::getIPAddress() const
{
  return ipAddress;
}

string Server::getServerName() const
{
  return serverName;
}

std::unordered_map<int, Room*>::iterator Server::getRoomIterator()
{
  return roomCollection.begin();
}

void Server::requestRooms()
{
  // do HTTP API shit
}

std::pair<Message*,Message*> Server::requestMessageData(Room* where, int amount, unsigned long startMessage, bool requestFromBack)
{
  int roomId = where->getRoomID();
  string path = "/room/" + std::to_string(roomId);
  json::value requestObject = json::value::object();
  requestObject[U("accessPassword")] = json::value::string(U(where->getRoomPass()));
  requestObject[U("messageCount")] = json::value::number(amount);
  if(!requestFromBack)
    requestObject[U("messageOffset")] = json::value::number(U(startMessage));

  std::ostringstream strStream;
  requestObject.serialize(std::cout);
  
  
  string responseJSON;
  bool requestAccepted = false;
  // do HTTP API shit
  
  //const JSONObject& parsedResponse = JSON::Parse(responseJSON)->asObject();

  Message* oldestInBatch(nullptr);
  Message* newestInBatch(nullptr);
  
  if(requestAccepted)
  {
    //const JSONArray& messageArray = parsedResponse["messages"];
    /*
    for(auto currMessage: messageArray)
    {
      const JSONObject& currMessObj = currMessage->asObject();
      Message* createdMess = new Message(currMessObj["message"], currMessObj["timeStamp"], currMessObj["messageId"],
      				 where, currMessObj["sender"]);
      createdMess->setPrevMessage(newestInBatch);
      newestInBatch->setNextMessage(createdMess);

      if(oldestInBatch == nullptr)
	oldestInBatch = createdMess;

      newestInBatch = createdMess;
    }
    */
    
  }
  else
  {
    
  }
  
  return std::make_pair(oldestInBatch, newestInBatch);
  
}
