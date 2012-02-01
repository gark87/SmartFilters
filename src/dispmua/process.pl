#!/usr/bin/perl
#
# gark87 (c) 2011
#

use strict;
use warnings;

sub isBot($) {
  my $mua = shift;
  return 1;
}

print "RobotUtil.smartfilters_dispMUA = {};\n";

while(<>) {
  s/\bdispMUA.arDispMUAAllocation\b/RobotUtil.smartfilters_dispMUA/og;
  s/^(\s*"(([^"]|\\")*)"\s*:\s*)\[.*$/$1.isBot($2).','/oe;
  print;
}
