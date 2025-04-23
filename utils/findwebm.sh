cwd=${PWD##*/}
f=${cwd}.txt
rm -f $f
find . -name *.webm -print0 | while IFS= read -r -d '' file; do
    echo $file
    echo -n "$file", >> $f
    /c/Utils/ffmpeg/bin/ffprobe -v error -show_entries stream=width -of default=noprint_wrappers=1 "$file" >> $f
done

cp $f ../../systems/gurps/utils
ls -l ../../systems/gurps/utils/$f