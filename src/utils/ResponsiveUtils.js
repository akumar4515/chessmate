import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Device type detection
export const isTablet = width > 768;
export const isSmallScreen = height < 700;
export const isLargeScreen = height > 800;
export const isLandscape = width > height;

// Responsive font sizes
export const getResponsiveFontSize = (baseSize) => {
  if (isTablet) return baseSize * 1.2;
  if (isSmallScreen) return baseSize * 0.8;
  return baseSize;
};

// Responsive spacing
export const getResponsiveSpacing = (baseSpacing) => {
  if (isTablet) return baseSpacing * 1.3;
  if (isSmallScreen) return baseSpacing * 0.7;
  return baseSpacing;
};

// Responsive dimensions
export const getResponsiveDimensions = () => ({
  width,
  height,
  isTablet,
  isSmallScreen,
  isLargeScreen,
  isLandscape,
  safeAreaTop: 0, // Will be set by useSafeAreaInsets
  safeAreaBottom: 0, // Will be set by useSafeAreaInsets
});

// Chess board responsive calculations
export const getChessBoardDimensions = () => {
  const baseSquareSize = Math.min(width * 0.113, 45);
  const squareSize = isTablet 
    ? Math.min(width * 0.08, 60) 
    : isSmallScreen 
      ? Math.min(width * 0.12, 35) 
      : baseSquareSize;
  
  return {
    squareSize,
    boardSize: squareSize * 8,
    pieceSize: squareSize * 0.8,
  };
};

// Responsive styles helper
export const createResponsiveStyles = (baseStyles) => {
  return {
    ...baseStyles,
    // Add responsive modifications here if needed
  };
};
