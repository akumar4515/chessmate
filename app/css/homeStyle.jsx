import { StyleSheet,Dimensions, Settings} from 'react-native';
const { width, height } = Dimensions.get('window');
const styles = StyleSheet.create({
    container:{
        flex:1,
        marginTop:height*0.04,
        justifyContent:"space-around",
        width:width,
        height:height

    },
    setting:{
        width:width,
        height:50,
        
        flex:1,
        alignItems:'flex-end',


    },
    settingImg:{
        height:50,
        width:50
    },
    chessmate:{
        height:50,
        width:50


    },
    chessmateImg:{
        height:50,
        width:width,

    }

});
export default styles;