import { StyleSheet } from "react-native";

const styles=StyleSheet.create({
  
    MainView:{
        flex: 1,
        
        margin: 0,
        padding: 0,
        justifyContent: "center",
        alignItems: "center",
        objectFit:"cover"
    
       
    },
    header:{
        position:"absolute",
        width:"100%",
        display:"flex",
        justifyContent:"flex-end",
        alignItems:"flex-end",
        padding:20,

    },
    about:{
        justifyContent:"flex-end",
        borderWidth:2,
        borderRadius:50,
        borderColor:"black",
        width:20,
        height:20,
        display:"flex",
        justifyContent:"center",
        alignItems:"center",

    },
    aboutIcon:{
        color:"blue",
        fontWeight:"900",


    },
  


    auth:{
        flex:1,
        display:"flex",
        marginBottom:400,
        justifyContent:"flex-end",
        alignItems:"center",
       gap:30


    },
    btnArrange:{
        display:"flex",
        flexDirection:"row",
        justifyContent:"space-evenly",
        flexWrap:"wrap",
        alignItems:"center",
        gap:20,



    },
    button: {
        height:70,
        width:150,
        borderRadius: 15,
      
        alignItems: 'center',
        justifyContent: 'center',
       
    },
    heading:{
        textAlign:"center"

    },
    authBtn:{

        backgroundColor:"white",
        borderWidth:1,
        borderRadius:15,
        width:150,
        height:70,
        display:"flex",
       
        justifyContent:"space-around",
        alignItems:"center",
        gap:80,

    },
    buttonText:{
        color:"#FFFFFF",
        fontWeight:"bold",
        fontSize:19,
      

     

    },

    
    image: {
        width: 200,
        height: 200,
        justifyContent:"center",
      },   
    
})
export default styles;