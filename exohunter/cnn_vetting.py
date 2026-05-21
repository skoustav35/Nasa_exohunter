import os
import sys
import warnings

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

class ExoNet1D(nn.Module if TORCH_AVAILABLE else object):
    """
    1D Convolutional Neural Network for Photometric Vetting.
    Takes phase-folded, normalized light curve flux and outputs probabilities for:
    [Planet, Eclipsing Binary, Noise/Junk]
    """
    def __init__(self, input_length=2000):
        super(ExoNet1D, self).__init__()
        if not TORCH_AVAILABLE:
            return
            
        self.conv1 = nn.Conv1d(in_channels=1, out_channels=16, kernel_size=11, stride=1, padding=5)
        self.conv2 = nn.Conv1d(in_channels=16, out_channels=32, kernel_size=11, stride=1, padding=5)
        self.conv3 = nn.Conv1d(in_channels=32, out_channels=64, kernel_size=11, stride=1, padding=5)
        self.pool = nn.MaxPool1d(kernel_size=4, stride=4)
        self.dropout = nn.Dropout(0.3)
        
        # Calculate flattened dimension
        def conv_output_shape(h_w, kernel_size=11, stride=1, pad=5):
            from math import floor
            return floor((h_w + 2 * pad - kernel_size) / stride) + 1
        
        # Input: 2000 -> conv1 -> pool -> 500
        # 500 -> conv2 -> pool -> 125
        # 125 -> conv3 -> pool -> 31
        linear_input_size = 64 * 31
        
        self.fc1 = nn.Linear(linear_input_size, 128)
        self.fc2 = nn.Linear(128, 3) # 3 classes

    def forward(self, x):
        x = self.pool(F.relu(self.conv1(x)))
        x = self.pool(F.relu(self.conv2(x)))
        x = self.pool(F.relu(self.conv3(x)))
        x = x.view(x.size(0), -1)
        x = self.dropout(F.relu(self.fc1(x)))
        x = self.fc2(x)
        return torch.softmax(x, dim=1)

def evaluate_transit_cnn(flux_array):
    """
    Evaluates a folded transit using the ExoNet1D model.
    If the model weights are not found, or PyTorch is unavailable, it returns a bypass flag.
    """
    if not TORCH_AVAILABLE:
        print("[CNN VETTING] PyTorch not installed. Bypassing deep learning prior.", file=sys.stderr)
        return {"status": "bypassed", "reason": "PyTorch unavailable"}
    
    try:
        import numpy as np
        
        # Ensure length is exactly 2000 by interpolating or padding
        expected_len = 2000
        flux = np.array(flux_array)
        if len(flux) == 0:
             return {"status": "error", "reason": "Empty flux array"}
             
        if len(flux) != expected_len:
            from scipy.interpolate import interp1d
            x_old = np.linspace(0, 1, len(flux))
            x_new = np.linspace(0, 1, expected_len)
            f = interp1d(x_old, flux, kind='linear')
            flux = f(x_new)
            
        tensor_in = torch.tensor(flux, dtype=torch.float32).unsqueeze(0).unsqueeze(0) # Shape: (1, 1, 2000)
        
        model = ExoNet1D()
        weights_path = os.path.join(os.path.dirname(__file__), "weights", "exonnet_v1.pth")
        
        if os.path.exists(weights_path):
            model.load_state_dict(torch.load(weights_path, map_location=torch.device('cpu')))
            model.eval()
            with torch.no_grad():
                probs = model(tensor_in).squeeze().numpy()
        else:
            print("[CNN VETTING] Weights not found. Returning untrained prior.", file=sys.stderr)
            # Without weights, return a non-committal default prior
            probs = np.array([0.33, 0.33, 0.34])
            
        return {
            "status": "success",
            "p_planet": float(probs[0]),
            "p_eb": float(probs[1]),
            "p_noise": float(probs[2])
        }
    except Exception as e:
        print(f"[CNN VETTING ERROR] {e}", file=sys.stderr)
        return {"status": "error", "reason": str(e)}
