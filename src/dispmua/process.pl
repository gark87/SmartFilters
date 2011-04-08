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

while(<>) {
  s/\bdispMUA.arDispMUAAllocation\b/smartfilters_dispMUA.arDispMUAAllocation/og;
  s/^(\s*"(([^"]|\\")*)"\s*:\s*)\[.*$/$1.isBot($2).','/oe;
  print;
}
