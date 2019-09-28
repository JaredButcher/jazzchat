// Hacky test that I can edit quickly to test features
// Lauren Smith

#include "server.hpp"
#include "room.hpp"
#include "message.hpp"

int main()
{
  Server* foo = new Server("test");
  Room* bar = new Room("foo","bar",foo,123);
  foo->requestMessageData(bar,50,10);

  delete foo;
  return 0;
}
