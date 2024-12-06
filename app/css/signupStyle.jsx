import { StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center",
  },

  authPage: {
    flex: 1,
    // justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop:40,
  },
  icon: {
    marginTop:height*0.08,
    width: 400,
    height:150,
   
  },
  inputGroup: {
    width: "100%",
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight:"900",
    color: "white",
    marginBottom: 5,
    textAlign: "left",
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
    fontSize: 16,
    fontWeight:"600",
    color: "black",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
  },
  terms: {
    fontSize: 14,
    fontWeight:"700",
    color: "black",
    textAlign: "center",
    marginVertical: 10,
  },
  link: {
    color: "blue",
    fontWeight:"900",
    textDecorationLine: "underline",
  },
  button: {
    backgroundColor: "#FF4081",
    width: "100%",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 15,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  signinText: {
    color: "black",
    fontWeight:"900",
    marginTop: 20,
    fontSize: 16,
    textAlign: "center",
  },
  message: {
    color: "#FF4081",
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
  },
});

export default styles;
