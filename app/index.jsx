import React, { useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions, ImageBackground } from "react-native";
import { useNavigation } from '@react-navigation/native';
const { width, height } = Dimensions.get('window');
import User from './User.jsx';
const user = {
  username: 'ChessMaster123',
  profilePicture: require('../assets/images/home/blitz.png'),
  ranking: '1500',
  gamesPlayed: '120',
  gamesWon: '85',
  gamesLost: '35',
};

export default function ChessMateHome() {
  const [selectedMode, setSelectedMode] = useState("classic"); // State to track the selected mode
  const [selectedOption, setSelectedOption] = useState(null); // State to track the selected option
  const [page,setPage]=useState("home");
  const navigation = useNavigation();
  
  const handleGame = () => {
    navigation.navigate("chess", { mode: selectedMode });
  };

  const handlePage = (name) => {
    setPage(name);
    console.log(`Navigating to page: ${name}`); // Log the new page directly
  };
  

  return (
    <View style={{ flex: 1 }}>
    {page==="home"?(
      <ImageBackground source={require("../assets/images/home/homebg.png")} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {/* <Image
            source={require("../assets/images/home/setting.png")}
            style={styles.icon}
          /> */}
          <TouchableOpacity style={styles.settingsIcon}>
            <Image
              source={require("../assets/images/home/setting.png")}
              style={styles.icon}
            />
          </TouchableOpacity>
        </View>

        {/* Middle Section */}
        <View style={styles.middle}>
          <Image
            source={require("../assets/images/home/chessmate.png")}
            style={styles.chessmateImg}
          />
          <Image
            source={require("../assets/images/home/letsplay.png")}
            style={styles.letsplayImg}
          />
        </View>

        {/* Modes */}
        <View style={styles.modesContainer}>
          <TouchableOpacity
            style={[
              styles.mode,
              selectedMode === 'classic' ? styles.selectedMode : null,
            ]}
            onPress={() => setSelectedMode('classic')}
          >
            <Image
              source={require("../assets/images/home/classic.png")}
              style={styles.modeImage}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.mode,
              selectedMode === 'blitz' ? styles.selectedMode : null,
            ]}
            onPress={() => setSelectedMode('blitz')}
          >
            <Image
              source={require("../assets/images/home/blitz.png")}
              style={styles.modeImage}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.mode,
              selectedMode === 'tempo' ? styles.selectedMode : null,
            ]}
            onPress={() => setSelectedMode('tempo')}
          >
            <Image
              source={require("../assets/images/home/tempo.png")}
              style={styles.modeImage}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.mode,
              selectedMode === 'blitz3m' ? styles.selectedMode : null,
            ]}
            onPress={() => setSelectedMode('blitz3m')}
          >
            <Image
              source={require("../assets/images/home/blitz3m.png")}
              style={styles.modeImage}
            />
          </TouchableOpacity>
        </View>

        {/* Chess Mid Section */}
        <View style={styles.chessmid}>
          <Image
            source={require("../assets/images/home/chessmid.png")}
            style={styles.chessmidImg}
          />
        </View>

        {/* Play Options */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.option,
              selectedOption === 'playcom' ? styles.selectedOption : null,
            ]}
            onPress={() => {
              navigation.navigate("chessAi", { mode: selectedMode });
            }}
          >
            <Image
              source={require("../assets/images/home/playcom.png")}
              style={styles.optionImage}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.option,
              selectedOption === 'playmulti' ? styles.selectedOption : null,
            ]}
            onPress={() => {
              navigation.navigate("chess", { mode: selectedMode });
            }}
          >
            <Image
              source={require("../assets/images/home/playmulti.png")}
              style={styles.optionImage}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.option,
              selectedOption === 'playon' ? styles.selectedOption : null,
            ]}
            // onPress={() => {
            //   navigation.navigate("chessMulti", { id: 100 });
            // }}
          >
            <Image
              source={require("../assets/images/home/playon.png")}
              style={styles.optionImage}
            />
          </TouchableOpacity>
        </View>
        </ScrollView>


        </ImageBackground>
    ): page === "user" ? (
      <View>
 <User user={user}/>
      </View>
    ) : null}
        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity name="home" onPress={() => handlePage("home")}>
            <Image
              source={require("../assets/images/home/home.png")}
              style={styles.footerIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity name="frnd" onPress={() => handlePage("frnd")}>
            <Image
              source={require("../assets/images/home/frnd.png")}
              style={styles.footerIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity name="cart"  onPress={() => handlePage("cart")}>
            <Image
              source={require("../assets/images/home/cart.png")}
              style={styles.footerIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity name="user" onPress={() => handlePage("user")}>
            <Image
              source={require("../assets/images/home/user.png")}
              style={styles.footerIcon}
            />
          </TouchableOpacity>
        </View>
        </View>
    
 )
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    padding: 20,
    alignItems: 'center',
  },
  icon: {
    marginTop:height*0.02,
    width: 40,
    height: 40,
  },
  middle: {
    alignItems: "center",
    marginTop: 20,
  },
  chessmateImg: {
    width: 250,
    height: 60,
    resizeMode: "contain",
  },
  letsplayImg: {
    width: 170,
    height: 60,
    resizeMode: "contain",
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    width: '100%',
    marginTop:10,
    marginBottom: 20,
  },
  modesContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: '100%',
    marginVertical: 20,
  },
  mode: {
    alignItems: "center",
    justifyContent: "flex-end",
    padding: 5,
    borderRadius: 10,
  },
  selectedMode: {
    paddingBottom: 10,
    borderWidth: 2,
    borderColor: "white",
  },
  modeImage: {
    width: width * 0.20,
    height: width * 0.25,
    resizeMode: "contain",
  },
  chessmid: {
    marginTop: 10,
    width: "100%",
  },
  chessmidImg: {
    height: 100,
    width: "100%",
    resizeMode: "cover",
  },
  optionsContainer: {
    marginTop: 10,
    width: '100%',
  },
  option: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2A2B6F",
    padding: 15,
    shadowColor: "white",
    shadowOpacity: 1,
    elevation: 10,
    marginVertical: 10,
    borderRadius: 10,
  },
  selectedOption: {
    borderWidth: 2,
    borderColor: "yellow",
  },
  optionImage: {
    width: "90%",
    height: 50,
    resizeMode: "contain",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: '100%',

    // marginTop: 20,
    backgroundColor:'#3E638F',
  position:"absolute",
  bottom:0
  },
  footerIcon: {
    width: 60,
    height: 60,
    resizeMode: "contain",
  },
});
