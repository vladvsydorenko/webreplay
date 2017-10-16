# Webreplay

Just an example to make reactive mouse event capturing.

Simple reactive example of how mouse recording could be done.
Don't use it at production :)

# How it works
There are streams from mousemove and clicks. Then they are merged and 
converting into timeline - a stream emiting values according to time.
And some dirty render function, but it's not the scope anyway.
