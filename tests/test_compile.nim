import std/unittest

suite "compile check":
  test "project compiles and basic sanity":
    check 1 + 1 == 2
