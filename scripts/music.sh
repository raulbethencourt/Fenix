#!/bin/zsh
# A Simple Shell Script To Transform youtube videos in mp3
# Raul Bethencourt - 28/06/2021
type=("webm" "mkv" "mp4")
for i in ${type}
do 
    for x in *.${i}
    do 
        ffmpeg -i "$x" "${x%.*}.mp3"
        rm ${x}
    done
done

