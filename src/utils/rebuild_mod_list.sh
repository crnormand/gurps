MODS="animated-spell-effects animated-spell-effects-cartoon jaamod JB2A_DnD5e jb2a_patreon"
cd ../../../modules
for d in $MODS
do
	if [ -d $d ]
	then
		echo "Found: $d"
		cd $d
		. ../../systems/gurps/utils/findwebm.sh
		cd ..
	fi
done